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
