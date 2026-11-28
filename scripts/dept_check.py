#!/usr/bin/env python3
"""평화학교 7개 부서 자동 점검 (무료, 파이썬 표준 라이브러리만 사용).

사용법:
  python3 scripts/dept_check.py                 # 저장소 전체 (www, docs, home, README 등)
  python3 scripts/dept_check.py www/ docs/x.md  # 지정한 경로만
  python3 scripts/dept_check.py --format md     # 마크다운 표로 출력 (결재 보고서용)
  python3 scripts/dept_check.py --dump 계획.docx  # .docx 본문을 텍스트로 출력

결과 등급: 오류(종료 코드 1) / 경고 / 참고. 규칙은 scripts/dept_rules.json 에서 조정함.
줄 끝에 'dept-check: ignore' 를 쓰면 그 줄은 점검하지 않음.
"""
from __future__ import annotations

import argparse
import json
import re
import struct
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RULES_PATH = Path(__file__).resolve().parent / "dept_rules.json"
IGNORE_MARK = "dept-check: ignore"

DEPT = {
    "dev": "개발팀",
    "design": "디자인팀",
    "marketing": "홍보팀",
    "social": "소셜·기록팀",
    "finance": "재무팀",
    "operations": "대외협력·운영팀",
    "legal": "법무·감사팀",
}
LEVEL_ORDER = {"오류": 0, "경고": 1, "참고": 2}


@dataclass
class Finding:
    level: str
    dept: str
    path: str
    line: int
    rule: str
    message: str


def load_rules(path: Path = RULES_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------- 파일 읽기
def docx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"<w:tab/>", "\t", xml)
    text = re.sub(r"<[^>]+>", "", xml)
    for a, b in (("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&apos;", "'"), ("&amp;", "&")):
        text = text.replace(a, b)
    return text


def html_visible_lines(src: str) -> list[str]:
    """HTML에서 script/style을 지우되 줄 번호는 유지함."""
    def blank(m: re.Match) -> str:
        return "\n" * m.group(0).count("\n")
    src = re.sub(r"(?is)<(script|style)\b.*?</\1>", blank, src)
    src = re.sub(r"(?s)<!--.*?-->", blank, src)
    src = re.sub(r"<[^>]+>", lambda m: " " + "\n" * m.group(0).count("\n"), src)  # 태그·속성 제거
    return src.split("\n")


def image_size(path: Path) -> tuple[int, int] | None:
    data = path.read_bytes()
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:2] != b"\xff\xd8":
        return None
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        length = struct.unpack(">H", data[i + 2:i + 4])[0]
        i += 2 + length
    return None


# ---------------------------------------------------------------- 대상 수집
def collect(targets: list[str], rules: dict) -> list[Path]:
    exts = set(rules["doc_exts"] + rules["code_exts"] + rules["image_exts"])
    ex_dirs = set(rules["exclude_dirs"])
    ex_files = set(rules["exclude_files"])
    if not targets:
        targets = [str(ROOT)]
    out: list[Path] = []
    for t in targets:
        p = Path(t)
        if not p.is_absolute():
            p = (Path.cwd() / p).resolve()
        if p.is_file():
            out.append(p)  # 직접 지정한 파일은 제외 목록과 관계없이 점검
            continue
        if not p.exists():
            print(f"[경고] 경로 없음: {t}", file=sys.stderr)
            continue
        for f in sorted(p.rglob("*")):
            if not f.is_file() or f.suffix.lower() not in exts:
                continue
            rel_parts = f.relative_to(p).parts
            if any(part in ex_dirs for part in rel_parts[:-1]) or f.name in ex_files:
                continue
            out.append(f)
    return out


def rel(p: Path) -> str:
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


# ---------------------------------------------------------------- 점검 규칙
PHONE_RE = re.compile(r"(?<!\d)01[016789]-?\d{3,4}-?\d{4}(?!\d)")
RRN_RE = re.compile(r"(?<!\d)\d{6}-[1-4]\d{6}(?!\d)")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
LOOSE_DATE_RE = re.compile(r"(?<![\d.])(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?![\d])")
MONEY_RE = re.compile(r"\d[\d,]*\s*(?:만\s*)?원(?![가-힣])")
POLITE_RE = re.compile(r"(합니다|습니다|입니다|됩니다|드립니다)[.\s]*$")


def check_text(path: Path, lines: list[str], rules: dict, kind: str, out: list[Finding]) -> None:
    rp = rel(path)
    on = rules["official_name"]
    first_full = first_short = None
    money_count = 0
    is_doc = kind == "doc"

    for no, line in enumerate(lines, 1):
        if IGNORE_MARK in line:
            continue
        # 개인정보 (법무·감사팀)
        for m in RRN_RE.finditer(line):
            out.append(Finding("오류", "legal", rp, no, "개인정보", f"주민등록번호 형식 발견: {m.group(0)[:7]}******"))
        for m in PHONE_RE.finditer(line):
            num = m.group(0)
            norm = re.sub(r"\D", "", num)
            allowed = {re.sub(r"\D", "", a) for a in rules["allowed_phones"]}
            if norm not in allowed:
                out.append(Finding("오류", "legal", rp, no, "개인정보", f"휴대전화 번호 노출: {num[:3]}-****-{norm[-4:]}"))
        for m in EMAIL_RE.finditer(line):
            em = m.group(0)
            if em.lower() not in {a.lower() for a in rules["allowed_emails"]} and not em.endswith((".png", ".jpg")):
                out.append(Finding("경고", "legal", rp, no, "개인정보", f"허용 목록에 없는 이메일 주소: {em}"))
        # 공식 명칭 (홍보팀)
        for w in on["wrong"]:
            if w in line:
                out.append(Finding("오류", "marketing", rp, no, "공식 명칭", f"잘못된 기관명 '{w}' → '{on['full']}'"))
        if first_full is None and on["full"] in line:
            first_full = no
        if first_short is None and on["short"] in line and on["full"] not in line:
            first_short = no
        # 비용 원칙 (재무팀)
        for w in rules["paid_terms"]:
            if w.lower() in line.lower() and not any(n in line for n in rules["paid_terms_negations"]):
                out.append(Finding("경고", "finance", rp, no, "무료 원칙", f"유료 서비스 관련 표현 '{w}' — 실제 사용 여부 확인"))
        if not is_doc:
            continue
        # 정치적 중립 (법무·감사팀)
        for w in rules["political_terms"]:
            if w in line:
                out.append(Finding("경고", "legal", rp, no, "정치 중립", f"정치 관련 표현 '{w}' — 사실 서술인지, 삭제 가능한지 확인"))
        # 과장 표현 (홍보팀)
        for w in rules["hype_terms"]:
            if w in line:
                out.append(Finding("경고", "marketing", rp, no, "과장 표현", f"과장·단정 표현 '{w}'"))
        # 날짜 표기 (대외협력·운영팀)
        for m in LOOSE_DATE_RE.finditer(line):
            y, mo, d = m.groups()
            out.append(Finding("참고", "operations", rp, no, "날짜 표기",
                               f"'{m.group(0)}' → 공문서 표기 '{y}. {int(mo)}. {int(d)}.'"))
        money_count += len(MONEY_RE.findall(line))

    if first_short is not None and (first_full is None or first_short < first_full) and is_doc:
        out.append(Finding("경고", "marketing", rp, first_short, "공식 명칭",
                           f"'{on['short']}'이 '{on['full']}'보다 먼저 나옴 — 첫 표기는 정식 명칭"))
    if is_doc and money_count >= rules.get("budget_money_threshold", 5):
        body = "\n".join(lines)
        if not any(mk in body for mk in rules["estimate_markers"]):
            out.append(Finding("경고", "finance", rp, 1, "추정 표시",
                               f"금액 {money_count}건이 있으나 '(안)·추정·확인 필요' 표시가 없음"))


def check_official_style(path: Path, lines: list[str], out: list[Finding]) -> None:
    """--style official: 보고서 개조식 점검 (서술체 종결 찾기)."""
    rp = rel(path)
    hits = [no for no, l in enumerate(lines, 1) if POLITE_RE.search(l.strip()) and IGNORE_MARK not in l]
    if hits:
        out.append(Finding("참고", "operations", rp, hits[0], "공문서체",
                           f"서술체 종결(~합니다) {len(hits)}줄 — 보고서는 개조식(~함·~임) 권장"))


def check_logo_css(path: Path, lines: list[str], rules: dict, out: list[Finding]) -> None:
    """CSS 규칙 중 로고 관련 선택자에 회전·필터·그림자·애니메이션이 있는지 (디자인팀)."""
    rp = rel(path)
    src = "\n".join(lines)
    pat = re.compile(r"([^{}]+)\{([^{}]*)\}")
    names = rules["logo_name_patterns"]
    for m in pat.finditer(src):
        selector, body = m.group(1), m.group(2)
        if not any(n in selector.lower() for n in names):
            continue
        if IGNORE_MARK in body or IGNORE_MARK in selector:
            continue
        no = src[: m.start(2)].count("\n") + 1
        for level, props, why in (("오류", rules["logo_forbidden_css"], "로고 변형 금지"),
                                  ("경고", rules.get("logo_warn_css", []), "로고 그림자 금지 — 로고 자체가 아닌 바탕 카드인지 확인")):
            hit = next((p for p in props if re.search(rf"(^|[\s;:{{]){re.escape(p)}\s*:", body)
                        and not re.search(rf"{re.escape(p)}\s*:\s*none", body)), None)
            if hit:
                out.append(Finding(level, "design", rp, no, "로고 원형",
                                   f"로고 선택자 '{selector.strip()[:60]}'에 '{hit}' 적용 — {why}"))


def check_logo_image(path: Path, rules: dict, out: list[Finding]) -> None:
    name = path.name.lower()
    if not any(n in name for n in rules["logo_name_patterns"]):
        return
    if any(s in name for s in rules["logo_skip_patterns"]):
        return
    size = image_size(path)
    if not size or not size[1]:
        return
    ratio = size[0] / size[1]
    best_name, best = min(rules["official_logo_ratios"].items(), key=lambda kv: abs(kv[1] - ratio) / kv[1])
    diff = abs(best - ratio) / best
    if diff > rules["logo_ratio_tolerance"]:
        out.append(Finding("오류", "design", rel(path), 0, "로고 원형",
                           f"가로세로비 {ratio:.3f} — 가장 가까운 공식 원본({best_name} {best:.3f})과 {diff:.1%} 차이 (비율 변형 의심)"))


def run(targets: list[str], rules: dict, style_official: bool = False) -> list[Finding]:
    findings: list[Finding] = []
    for f in collect(targets, rules):
        ext = f.suffix.lower()
        try:
            if ext in rules["image_exts"]:
                check_logo_image(f, rules, findings)
                continue
            if ext == ".docx":
                lines = docx_text(f).split("\n")
                kind = "doc"
            else:
                raw = f.read_text(encoding="utf-8", errors="replace")
                if ext in (".html", ".htm"):
                    check_logo_css(f, re.findall(r"(?is)<style\b[^>]*>(.*?)</style>", raw) or [""], rules, findings)
                    lines = html_visible_lines(raw)
                    kind = "doc"
                elif ext in rules["doc_exts"]:
                    lines, kind = raw.split("\n"), "doc"
                else:
                    lines, kind = raw.split("\n"), "code"
                    if ext == ".css":
                        check_logo_css(f, lines, rules, findings)
            check_text(f, lines, rules, kind, findings)
            if style_official and kind == "doc":
                check_official_style(f, lines, findings)
        except Exception as e:  # 읽을 수 없는 파일은 참고로만 남김
            findings.append(Finding("참고", "dev", rel(f), 0, "읽기 실패", str(e)))
    findings.sort(key=lambda x: (LEVEL_ORDER[x.level], x.dept, x.path, x.line))
    return findings


# ---------------------------------------------------------------- 출력
def print_report(findings: list[Finding], fmt: str) -> None:
    count = {k: sum(1 for f in findings if f.level == k) for k in LEVEL_ORDER}
    if fmt == "json":
        print(json.dumps([f.__dict__ | {"dept_name": DEPT[f.dept]} for f in findings], ensure_ascii=False, indent=2))
        return
    if fmt == "md":
        print(f"### 자동 점검 결과: 오류 {count['오류']}건 · 경고 {count['경고']}건 · 참고 {count['참고']}건\n")
        if not findings:
            print("지적 사항 없음")
            return
        print("| 등급 | 부서 | 위치 | 항목 | 내용 |")
        print("|---|---|---|---|---|")
        for f in findings:
            loc = f"{f.path}:{f.line}" if f.line else f.path
            print(f"| {f.level} | {DEPT[f.dept]} | `{loc}` | {f.rule} | {f.message.replace('|', '/')} |")
        return
    for f in findings:
        loc = f"{f.path}:{f.line}" if f.line else f.path
        print(f"[{f.level}] {DEPT[f.dept]} | {loc} | {f.rule}: {f.message}")
    print(f"\n합계: 오류 {count['오류']}건, 경고 {count['경고']}건, 참고 {count['참고']}건")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="평화학교 7개 부서 자동 점검")
    ap.add_argument("targets", nargs="*", help="점검할 파일·폴더 (기본: 저장소 전체)")
    ap.add_argument("--format", choices=["text", "md", "json"], default="text")
    ap.add_argument("--style", choices=["official"], help="official: 보고서 개조식 문체도 점검")
    ap.add_argument("--dump", metavar="DOCX", help=".docx 본문을 텍스트로 출력하고 종료")
    ap.add_argument("--rules", default=str(RULES_PATH))
    a = ap.parse_args(argv)
    if a.dump:
        print(docx_text(Path(a.dump)))
        return 0
    rules = load_rules(Path(a.rules))
    findings = run(a.targets, rules, style_official=a.style == "official")
    print_report(findings, a.format)
    return 1 if any(f.level == "오류" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
