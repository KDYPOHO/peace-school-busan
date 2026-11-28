// 강의 알림: 휴대폰 자체 알림(로컬 알림)으로 강의 전날 19:00과 시작 1시간 전에 알려 줌
// 서버·푸시 서비스를 쓰지 않으므로 비용 0원. 앱(iOS·Android)에서만 동작하고 웹에서는 숨김
import { lectureWindow } from "./course.js";

const BASE_ID = 7100; // 강의 n의 알림 번호: 7100 + n*10 + (0: 전날, 1: 1시간 전)
const HOUR = 3_600_000;
const plugin = () => (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.LocalNotifications) || null;

export const remindersAvailable = () => !!plugin();

// 강의 일정에서 앞으로 울릴 알림 목록을 만든다 (시험하기 쉽도록 순수 함수)
export function lectureReminders(lectures, now = Date.now()) {
  const out = [];
  for (const lecture of lectures) {
    if ("schedule" in lecture && !lecture.schedule) continue;
    const { start } = lectureWindow(lecture);
    // 전날 19:00 (한국 시간)
    const startDay = new Date(start + 9 * HOUR).toISOString().slice(0, 10);
    const eve = Date.parse(`${startDay}T19:00:00+09:00`) - 24 * HOUR;
    const items = [
      { id: BASE_ID + lecture.n * 10, at: eve, title: `[내일 ${lecture.n}강] ${lecture.title}`, body: `내일 ${lecture.start} 시작이에요. 앱의 QR 수강증을 준비해 주세요.` },
      { id: BASE_ID + lecture.n * 10 + 1, at: start - HOUR, title: `[1시간 뒤 ${lecture.n}강] ${lecture.title}`, body: `${lecture.start}에 시작해요. 온라인 참여자는 시작 30분 전부터 출석할 수 있어요.` }
    ];
    for (const item of items) if (item.at > now + 60_000) out.push(item);
  }
  return out;
}

const allIds = lectures => lectures.flatMap(l => [BASE_ID + l.n * 10, BASE_ID + l.n * 10 + 1]);

// 알림 켜기: 권한을 묻고 일정을 예약. 반환값 true = 예약됨
export async function enableReminders(lectures) {
  const p = plugin(); if (!p) return false;
  let perm = await p.checkPermissions();
  if (perm.display !== "granted") perm = await p.requestPermissions();
  if (perm.display !== "granted") return false;
  await syncReminders(lectures);
  return true;
}

export async function syncReminders(lectures) {
  const p = plugin(); if (!p) return;
  await p.cancel({ notifications: allIds(lectures).map(id => ({ id })) }).catch(() => {});
  const items = lectureReminders(lectures);
  if (!items.length) return;
  await p.schedule({
    notifications: items.map(item => ({ id: item.id, title: item.title, body: item.body, schedule: { at: new Date(item.at), allowWhileIdle: true } }))
  });
}

export async function disableReminders(lectures) {
  const p = plugin(); if (!p) return;
  await p.cancel({ notifications: allIds(lectures).map(id => ({ id })) }).catch(() => {});
}
