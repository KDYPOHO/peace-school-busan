import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lectureReminders } from '../www/js/reminders.js';
import { LECTURES } from '../www/js/config.js';

test('강의 알림은 전날 19:00(한국 시간)과 시작 1시간 전, 앞으로 남은 것만 만든다', () => {
  const now = Date.parse('2027-04-10T12:30:00+09:00');
  const items = lectureReminders(LECTURES, now);
  // 1강 전날 알림은 이미 지났고, 1시간 전(13:00)은 남음
  assert.equal(items[0].id, 7111);
  assert.equal(items[0].at, Date.parse('2027-04-10T13:00:00+09:00'));
  const eve2 = items.find(item => item.id === 7120);
  assert.equal(eve2.at, Date.parse('2027-04-30T19:00:00+09:00'));
  assert.equal(items.length, 1 + 2 * (LECTURES.length - 1));
  assert.ok(items.every(item => !/\d{3}-\d{4}/.test(item.body)), '알림에 연락처 같은 개인정보가 없음');
});

test('운영 일정이 비어 있는 강의(schedule: null)는 알림을 만들지 않는다', () => {
  const items = lectureReminders([{ ...LECTURES[1], schedule: null }], 0);
  assert.equal(items.length, 0);
});
