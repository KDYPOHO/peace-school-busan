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

export function deepDeadlineLabel(closesAt) {
  if (!Number.isFinite(closesAt)) return '';
  const day = 86_400_000;
  const kst = closesAt + 9 * 3_600_000;
  // Midnight closes the preceding application day.
  const shown = new Date(kst % day === 0 ? kst - 1 : kst);
  const hours = String(shown.getUTCHours()).padStart(2, '0');
  const minutes = String(shown.getUTCMinutes()).padStart(2, '0');
  return `${shown.getUTCMonth() + 1}. ${shown.getUTCDate()}. ${hours}:${minutes}`;
}
