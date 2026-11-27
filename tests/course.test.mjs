import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countedLectures } from '../www/js/course.js';
import { faqAnswer } from '../www/js/faq.js';

test('counts each scheduled lecture once and preserves legacy numeric strings', () => {
  assert.deepEqual(countedLectures([1, 2, '2', 3, '4', 42, '5extra', null, true]), [1, 2, 3, 4]);
});

test('uses specific dates and requirements for advanced enrollment questions', () => {
  const context = { next: null, fmtDate: value => value };
  assert.equal(faqAnswer('심화과정 신청은 언제까지인가요?', context).src, '운영 계획 심화과정');
  assert.equal(faqAnswer('수료증은 언제 발급하나요?', context).src, '수료증 발급 안내');
});
