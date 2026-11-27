import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countedLectures, deepDeadlineLabel } from '../www/js/course.js';
import { faqAnswer } from '../www/js/faq.js';

test('counts each scheduled lecture once and preserves legacy numeric strings', () => {
  assert.deepEqual(countedLectures([1, 2, '2', 3, '4', 42, '5extra', null, true]), [1, 2, 3, 4]);
});

test('uses specific dates and requirements for advanced enrollment questions', () => {
  const context = { next: null, fmtDate: value => value };
  assert.equal(faqAnswer('심화과정 신청은 언제까지인가요?', context).src, '운영 계획 심화과정');
  assert.equal(faqAnswer('수료증은 언제 발급하나요?', context).src, '수료증 발급 안내');
});

test('온라인 출석 허용 시각은 KST 기준으로 경계 양쪽을 구분한다', async () => {
  const { onlineOpenAt } = await import('../www/js/course.js');
  const lecture = { date: '2027-04-10', start: '14:00', end: '16:00' };
  const open = Date.parse('2027-04-10T13:30:00+09:00');
  const close = Date.parse('2027-04-10T17:00:00+09:00');
  assert.equal(onlineOpenAt(lecture, open - 1), false);
  assert.equal(onlineOpenAt(lecture, open), true);
  assert.equal(onlineOpenAt(lecture, close), true);
  assert.equal(onlineOpenAt(lecture, close + 1), false);
});

test('심화 지원 안내는 서버 마감값만 사용한다', () => {
  const question = '심화과정 신청은 언제까지인가요?';
  assert.match(faqAnswer(question, {}).a, /지원 일정을 확인 중/);
  assert.doesNotMatch(faqAnswer(question, {}).a, /6\. 20\.|6월 20일/);
  const evening = Date.parse('2027-06-25T18:00:00+09:00');
  const midnight = Date.parse('2027-06-26T00:00:00+09:00');
  assert.equal(deepDeadlineLabel(evening), '6. 25. 18:00');
  assert.equal(deepDeadlineLabel(midnight), '6. 25. 23:59');
  assert.match(faqAnswer(question, { deepDeadline: evening }).a, /6\. 25\. 18:00/);
});
