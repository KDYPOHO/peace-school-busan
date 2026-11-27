import { LECTURES } from './config.js';

export function countedLectures(values) {
  const recorded = new Set(values.map(value =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  ));
  return LECTURES.map(lecture => lecture.n).filter(number => recorded.has(number));
}

export function lectureWindow(lecture) {
  const start = Date.parse(`${lecture.date}T${lecture.start}:00+09:00`);
  const endDay = lecture.end < lecture.start ? start + 24 * 3600_000 : start;
  const endDate = new Date(endDay + 9 * 3600_000).toISOString().slice(0, 10);
  const end = Date.parse(`${endDate}T${lecture.end}:00+09:00`);
  return { start, end, opensAt: start - 30 * 60_000, closesAt: end + 60 * 60_000 };
}

export function onlineOpenAt(lecture, now) {
  if (!lecture) return false;
  const { opensAt, closesAt } = lectureWindow(lecture);
  return opensAt <= now && now <= closesAt;
}
