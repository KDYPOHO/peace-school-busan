import { LECTURES } from './config.js';

export function countedLectures(values) {
  const recorded = new Set(values.map(value =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  ));
  return LECTURES.map(lecture => lecture.n).filter(number => recorded.has(number));
}
