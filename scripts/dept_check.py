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
            if w in line and not any(n in line for n in rules.get("hype_negations", [])):
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


# ---------------------------------------------------------------- 추가 정밀 점검
import datetime as _dt

WEEKDAYS = "월화수목금토일"
FULL_DAY_RE = re.compile(r"(20\d{2})\.\s?(\d{1,2})\.\s?(\d{1,2})\.?\s?\(([월화수목금토일])\)")
SHORT_DAY_RE = re.compile(r"(?<![\d.])(\d{1,2})\.\s?(\d{1,2})\.?\s?\(([월화수목금토일])\)")
YEAR_RE = re.compile(r"(?<!\d)(20\d{2})(?:년|\.)")
ISO_DAY_RE = re.compile(r'date:\s*"(20\d{2})-(\d{2})-(\d{2})"')


def check_weekdays(path: Path, lines: list[str], out: list[Finding], default_year: int | None) -> None:
    """날짜 옆 요일이 실제 달력과 맞는지 (대외협력·운영팀, 오류)."""
    rp = rel(path)
    year = default_year
    for no, line in enumerate(lines, 1):
        if IGNORE_MARK in line:
            continue
        spans = []
        for m in FULL_DAY_RE.finditer(line):
            y, mo, d, wd = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
            year = y
            spans.append(m.span())
            _cmp_day(rp, no, y, mo, d, wd, m.group(0), out)
        for m in SHORT_DAY_RE.finditer(line):
            if any(a <= m.start() < b for a, b in spans) or year is None:
                continue
            _cmp_day(rp, no, year, int(m.group(1)), int(m.group(2)), m.group(3), m.group(0), out)
        ym = YEAR_RE.findall(line)
        if ym:
            year = int(ym[-1])


def _cmp_day(rp, no, y, mo, d, wd, text, out):
    try:
        real = WEEKDAYS[_dt.date(y, mo, d).weekday()]
    except ValueError:
        out.append(Finding("오류", "operations", rp, no, "날짜 오류", f"존재하지 않는 날짜 '{text}' ({y}년 기준)"))
        return
    if real != wd:
        out.append(Finding("오류", "operations", rp, no, "요일 오류",
                           f"'{text}' — {y}. {mo}. {d}.은 {real}요일"))


NUM_RE = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


def _money(cell: str) -> float | None:
    c = cell.replace(" ", "")
    if not re.search(r"\d", c) or re.search(r"[×x*]", c):
        return None
    m = NUM_RE.search(c)
    if not m:
        return None
    v = float(m.group(0).replace(",", ""))
    if "억" in c:
        v *= 100_000_000
    elif "만" in c:
        v *= 10_000
    elif "천원" in c:
        v *= 1_000
    return v


def tables_from_md(lines: list[str]) -> list[tuple[int, list[list[str]]]]:
    tables, cur, start = [], [], 0
    for no, line in enumerate(lines + [""], 1):
        t = line.strip()
        if t.startswith("|") and t.endswith("|"):
            if not cur:
                start = no
            cells = [c.strip() for c in t.strip("|").split("|")]
            if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
                cur.append(cells)
        elif cur:
            tables.append((start, cur))
            cur = []
    return tables


def tables_from_docx(path: Path) -> list[tuple[int, list[list[str]]]]:
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    out = []
    for i, tbl in enumerate(re.findall(r"(?s)<w:tbl>.*?</w:tbl>", xml), 1):
        rows = []
        for tr in re.findall(r"(?s)<w:tr[ >].*?</w:tr>", tbl):
            cells = ["".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", tc)).strip()
                     for tc in re.findall(r"(?s)<w:tc>.*?</w:tc>", tr)]
            rows.append(cells)
        out.append((i, rows))
    return out


TOTAL_RE = re.compile(r"^(합\s*계|총\s*계|총\s*액|계)$")
SUBTOTAL_RE = re.compile(r"^(소\s*계|중\s*계)$")


def check_table_sums(rp: str, tables, out: list[Finding], docx: bool) -> None:
    """표의 소계·합계 행을 직접 다시 더해 검산 (재무팀, 오류).
    소계 = 직전 소계 이후 행들의 합, 합계 = 소계가 아닌 모든 행의 합."""
    def kind_of(row: list[str]) -> str | None:
        for c in row[:2]:
            c2 = c.replace(" ", "")
            if SUBTOTAL_RE.match(c2):
                return "sub"
            if TOTAL_RE.match(c2):
                return "total"
        return None

    def compare(row, rows_to_sum, label, start, r_i):
        for col in range(1, len(row)):
            tot = _money(row[col])
            if tot is None:
                continue
            vals = [_money(b[col]) for b in rows_to_sum if col < len(b)]
            vals = [v for v in vals if v is not None]
            if len(vals) < 2:
                continue
            s = sum(vals)
            if abs(s - tot) > max(1, abs(tot) * 0.0005):
                where = f"표 {start}번" if docx else f"표({start}번째 줄~)"
                out.append(Finding("오류", "finance", rp, 0 if docx else start + r_i, "합계 검산",
                                   f"{where} '{label}' {col + 1}열: 적힌 값 {tot:,.0f} ≠ 계산 값 {s:,.0f} (차이 {tot - s:+,.0f})"))

    for start, rows in tables:
        segment: list[list[str]] = []
        all_rows: list[list[str]] = []
        for r_i, row in enumerate(rows):
            k = kind_of(row)
            label = next((c for c in row if c), "")
            if k == "sub":
                compare(row, segment, f"{label} {row[1] if len(row) > 1 else ''}".strip(), start, r_i)
                segment = []
            elif k == "total":
                compare(row, all_rows, label, start, r_i)
                segment, all_rows = [], []
            else:
                segment.append(row)
                all_rows.append(row)


def load_config_facts() -> dict:
    p = ROOT / "www/js/config.js"
    if not p.exists():
        return {}
    src = p.read_text(encoding="utf-8")
    facts: dict = {"lectures": {}}
    for m in re.finditer(r'n:\s*(\d)\s*,\s*date:\s*"(20\d{2})-(\d{2})-(\d{2})"', src):
        facts["lectures"][int(m.group(1))] = (int(m.group(2)), int(m.group(3)), int(m.group(4)))
    m = re.search(r"ONSITE_CAP\s*=\s*(\d+)", src)
    if m:
        facts["onsite_cap"] = int(m.group(1))
    m = re.search(r"cap:\s*(\d+)", src)
    if m:
        facts["deep_cap"] = int(m.group(1))
    m = re.search(r"year:\s*(20\d{2})", src)
    if m:
        facts["year"] = int(m.group(1))
    return facts


CAP_RE = re.compile(r"정원\s*(?:은|:)?\s*(\d+)\s*명")
LECT_RE = re.compile(r"(?<!\d)([1-5])\s*강(?!\s*(?:이상|이하|중|까지|모두|전체|과정|출석))")
DATE_ANY_RE = re.compile(r"(?:(20\d{2})[.\-]\s?)?(\d{1,2})[.\-]\s?(\d{1,2})\.?")


def check_facts(path: Path, lines: list[str], facts: dict, out: list[Finding]) -> None:
    """정원·강의 날짜가 www/js/config.js와 같은지 (홍보팀, 경고)."""
    if not facts:
        return
    rp = rel(path)
    for no, line in enumerate(lines, 1):
        if IGNORE_MARK in line:
            continue
        prev = " ".join(lines[max(0, no - 3):no - 1])
        for m in CAP_RE.finditer(line):
            n = int(m.group(1))
            window = line[max(0, m.start() - 25):m.start()]
            deep_ctx = "심화" in window or ("심화" in prev and "기본" not in window)
            if deep_ctx and facts.get("deep_cap") and n != facts["deep_cap"]:
                out.append(Finding("경고", "marketing", rp, no, "사실 일치",
                                   f"심화과정 정원 {n}명 ≠ 앱 설정 {facts['deep_cap']}명"))
            elif not deep_ctx and ("기본" in window or "현장" in window) and facts.get("onsite_cap") and n != facts["onsite_cap"]:
                out.append(Finding("경고", "marketing", rp, no, "사실 일치",
                                   f"기본과정 현장 정원 {n}명 ≠ 앱 설정 {facts['onsite_cap']}명"))
        lm = LECT_RE.findall(line)
        if len(set(lm)) == 1 and "심화" not in line:
            n = int(lm[0])
            want = facts["lectures"].get(n)
            dm = [d for d in DATE_ANY_RE.finditer(line) if 1 <= int(d.group(2)) <= 12]
            if want and dm:
                d = dm[0]
                got = (int(d.group(2)), int(d.group(3)))
                if got != (want[1], want[2]):
                    out.append(Finding("경고", "marketing", rp, no, "사실 일치",
                                       f"{n}강 날짜 {got[0]}. {got[1]}. ≠ 앱 설정 {want[1]}. {want[2]}."))


def check_html_a11y(path: Path, raw: str, out: list[Finding]) -> None:
    """누리집·앱 HTML 접근성 기본 (디자인팀)."""
    rp = rel(path)
    if re.search(r"(?i)<html\b", raw) and not re.search(r'(?i)<html\b[^>]*\blang=', raw):
        out.append(Finding("경고", "design", rp, 1, "접근성", "<html>에 lang 속성 없음 (lang=\"ko\")"))
    if re.search(r"(?i)<html\b", raw) and not re.search(r"(?is)<title>\s*\S", raw):
        out.append(Finding("경고", "design", rp, 1, "접근성", "<title> 없음"))
    for m in re.finditer(r"(?is)<img\b[^>]*>", raw):
        tag = m.group(0)
        if IGNORE_MARK in tag:
            continue
        if not re.search(r"\balt\s*=", tag):
            no = raw[: m.start()].count("\n") + 1
            out.append(Finding("경고", "design", rp, no, "접근성", "이미지 대체 텍스트(alt) 없음"))
    for m in re.finditer(r"(?is)<a\b[^>]*target\s*=\s*[\"']_blank[\"'][^>]*>", raw):
        if not re.search(r"noopener|noreferrer", m.group(0)):
            no = raw[: m.start()].count("\n") + 1
            out.append(Finding("참고", "dev", rp, no, "보안", "새 창 링크에 rel=\"noopener\" 없음"))


PLAIN_MONEY_RE = re.compile(r"(?<![\d,.])(\d{5,})\s*원")


def check_doc_extras(path: Path, lines: list[str], out: list[Finding]) -> None:
    rp = rel(path)
    for no, line in enumerate(lines, 1):
        if IGNORE_MARK in line:
            continue
        for m in PLAIN_MONEY_RE.finditer(line):
            out.append(Finding("참고", "finance", rp, no, "금액 표기", f"'{m.group(0)}' → 세 자리마다 쉼표 ('{int(m.group(1)):,}원')"))
    head = next((l for l in lines if l.strip()), "")
    if "계획" in head and "(안)" not in head and IGNORE_MARK not in head:
        out.append(Finding("경고", "marketing", rp, 1, "추정 표시", "계획 문서 제목에 '(안)' 표시 없음"))


def run(targets: list[str], rules: dict, style_official: bool = False) -> list[Finding]:
    findings: list[Finding] = []
    facts = load_config_facts()
    for f in collect(targets, rules):
        ext = f.suffix.lower()
        try:
            if ext in rules["image_exts"]:
                check_logo_image(f, rules, findings)
                continue
            if ext == ".docx":
                lines = docx_text(f).split("\n")
                kind = "doc"
                check_table_sums(rel(f), tables_from_docx(f), findings, docx=True)
            else:
                raw = f.read_text(encoding="utf-8", errors="replace")
                if ext in (".html", ".htm"):
                    check_logo_css(f, re.findall(r"(?is)<style\b[^>]*>(.*?)</style>", raw) or [""], rules, findings)
                    check_html_a11y(f, raw, findings)
                    lines = html_visible_lines(raw)
                    kind = "doc"
                elif ext in rules["doc_exts"]:
                    lines, kind = raw.split("\n"), "doc"
                else:
                    lines, kind = raw.split("\n"), "code"
                    if ext == ".css":
                        check_logo_css(f, lines, rules, findings)
            check_text(f, lines, rules, kind, findings)
            check_weekdays(f, lines, findings, facts.get("year"))
            if kind == "doc":
                check_facts(f, lines, facts, findings)
                check_doc_extras(f, lines, findings)
                if ext == ".md":
                    check_table_sums(rel(f), tables_from_md(lines), findings, docx=False)
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
