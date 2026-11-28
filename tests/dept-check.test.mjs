// 7개 부서 자동 점검(scripts/dept_check.py) 규칙 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fx = (name) => path.join(root, "tests/fixtures/dept", name);

function check(...targets) {
  const r = spawnSync("python3", [path.join(root, "scripts/dept_check.py"), "--format", "json", ...targets], { encoding: "utf8" });
  assert.equal(r.error, undefined, String(r.error));
  return { code: r.status, findings: JSON.parse(r.stdout) };
}
const has = (findings, rule, level) => findings.some((f) => f.rule === rule && (!level || f.level === level));

test("문제 문서: 개인정보·명칭은 오류, 과장·정치·날짜는 표시", () => {
  const { code, findings } = check(fx("bad.md"));
  assert.equal(code, 1);
  assert.ok(has(findings, "개인정보", "오류"), "휴대전화 번호");
  assert.ok(findings.some((f) => f.rule === "개인정보" && f.message.includes("someone@example.com")));
  assert.ok(has(findings, "공식 명칭", "오류"), "잘못된 기관명");
  assert.ok(findings.some((f) => f.rule === "공식 명칭" && f.message.includes("먼저 나옴")));
  assert.ok(has(findings, "과장 표현"));
  assert.ok(has(findings, "정치 중립"));
  assert.ok(has(findings, "날짜 표기"));
  assert.ok(!JSON.stringify(findings).includes("9876-5432"), "번호 전체를 출력하지 않음");
});

test("기준에 맞는 문서는 지적 없음", () => {
  const { code, findings } = check(fx("good.md"));
  assert.equal(code, 0);
  assert.deepEqual(findings, []);
});

test("금액이 많은데 추정 표시가 없으면 재무팀 경고", () => {
  const { findings } = check(fx("budget.md"));
  assert.ok(findings.some((f) => f.rule === "추정 표시" && f.dept === "finance"));
});

test("로고 선택자에 애니메이션은 오류, 로고 아닌 요소의 회전은 통과", () => {
  const { findings } = check(fx("logo.css"));
  const logo = findings.filter((f) => f.rule === "로고 원형");
  assert.equal(logo.length, 1);
  assert.match(logo[0].message, /animation/);
});

test("로고 이미지 비율 변형 탐지", () => {
  const { findings } = check(fx("stretched-symbol.png"), fx("signature.png"));
  assert.equal(findings.length, 1);
  assert.match(findings[0].path, /stretched-symbol/);
});

test("현재 저장소에는 오류가 없음", () => {
  const { code, findings } = check();
  assert.equal(code, 0, JSON.stringify(findings.filter((f) => f.level === "오류"), null, 1));
});

test("요일·존재하지 않는 날짜는 오류 (짧은 날짜는 앞의 연도 기준)", () => {
  const { findings } = check(fx("dates.md"));
  const day = findings.filter((f) => f.rule === "요일 오류");
  assert.equal(day.length, 1, JSON.stringify(findings));
  assert.match(day[0].message, /8\. 13\.은 금요일/);
  assert.ok(findings.some((f) => f.rule === "날짜 오류" && f.message.includes("2. 30.")));
});

test("소계·합계 검산: 틀린 소계와 합계를 모두 찾음, '숙소 계약금'은 소계로 오인하지 않음", () => {
  const { findings } = check(fx("budget-wrong.md"));
  const sums = findings.filter((f) => f.rule === "합계 검산");
  assert.equal(sums.length, 2, JSON.stringify(sums));
  assert.ok(sums.some((f) => f.message.includes("380") && f.message.includes("370")));
  assert.ok(sums.some((f) => f.message.includes("990") && f.message.includes("970")));
});

test("정원·강의 날짜를 앱 설정(config.js)과 대조, '4강 이상'은 강의 번호로 보지 않음", () => {
  const { findings } = check(fx("facts.md"));
  const facts = findings.filter((f) => f.rule === "사실 일치");
  assert.equal(facts.length, 2, JSON.stringify(facts));
  assert.ok(facts.some((f) => f.message.includes("심화과정 정원 30명")));
  assert.ok(facts.some((f) => f.message.includes("2강 날짜 4. 25.")));
});

test("HTML 접근성: lang·title·alt 누락, 새 창 링크 noopener", () => {
  const { findings } = check(fx("page.html"));
  const msgs = findings.map((f) => f.message).join("\n");
  assert.match(msgs, /lang/);
  assert.match(msgs, /<title>/);
  assert.equal(findings.filter((f) => f.message.includes("alt")).length, 1);
  assert.match(msgs, /noopener/);
});

