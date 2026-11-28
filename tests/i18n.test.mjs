import test from "node:test";
import assert from "node:assert/strict";
import { tr } from "../www/js/i18n.js";

test("영어 화면: 고정 문구와 숫자 문구를 바꾼다", () => {
  assert.equal(tr("내 정보"), "My info");
  assert.equal(tr("  출석 완료 "), "  Checked in ");
  assert.equal(tr("3강 더 필요"), "3 more needed");
  assert.equal(tr("2027. 4. 24.(토)"), "2027. 4. 24.(Sat)");
  assert.equal(tr("BS27-AB12CD · 일반 청년 · 현장"), "BS27-AB12CD · General youth · In person");
});

test("영어 화면: 협의회 이름은 로마자로, 참가자 글은 그대로 둔다", () => {
  assert.equal(tr("부산지역회의 해운대구협의회"), "Haeundae-gu Council, Busan Regional Council");
  assert.equal(tr("2강 오늘 오후 2시, 부산시민공원 다솜관"), "2강 오늘 오후 2시, 부산시민공원 다솜관");
  assert.equal(tr("김하늘"), "김하늘");
});
