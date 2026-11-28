// 간담회 시연용 가상 자료 (실제 참가자 정보 없음, 이름은 모두 "가상 참가자 nn")
// 시연 시각은 2027. 5. 15.(토) 14:20 (3강 진행 중)으로 고정해 출석·현황 화면을 보여 줌
import { APP, LECTURES, TEAMS, CRITERIA } from "./config.js";
import { REGION_COUNCILS } from "./councils.js";

export const DEMO_NOW = Date.parse("2027-05-15T14:20:00+09:00");
export const DEMO_ACCOUNTS = {
  p: { uid: "demo_participant", email: "participant@demo.invalid", name: "" }, // 예약된 가상 주소(.invalid) dept-check: ignore
  a: { uid: "demo_admin", email: "admin@demo.invalid", name: "" }, // 예약된 가상 주소(.invalid) dept-check: ignore
  j: { uid: "demo_judge", email: "judge@demo.invalid", name: "" } // 예약된 가상 주소(.invalid) dept-check: ignore
};

const REGIONS = ["부산", "부산", "부산", "서울", "경기", "대구", "경남", "광주", "대전", "울산", "제주", "강원"];
const TYPES = ["일반 청년", "일반 청년", "청년 서포터즈·추천 청년", "자문위원"];
const pick = (list, i) => list[i % list.length];
const firstCouncil = region => (REGION_COUNCILS[region] || [""])[0];

function person(i, extra = {}) {
  const region = pick(REGIONS, i);
  const memberType = pick(TYPES, i);
  return {
    name: `가상 참가자 ${String(i).padStart(2, "0")}`,
    birthYear: String(1990 + (i % 15)),
    region, orgRegion: region, orgCouncil: firstCouncil(region),
    memberType, memberTerm: memberType === "자문위원" ? "제22기" : "", memberNo: "",
    memberVerified: memberType === "자문위원" ? (i % 2 ? "verified" : "pending") : "",
    org: "", phone: "", mode: i % 3 === 0 ? "online" : "onsite",
    optionalConsent: false, photoConsent: i % 2 === 0, termsAgreed: true,
    privacyVersion: APP.privacyVersion, termsVersion: APP.termsVersion,
    no: `BS27-DEMO${String(i).padStart(2, "0")}`, email: `p${i}@demo.invalid`,
    consent: true, consentAt: DEMO_NOW - 40 * 86_400_000, createdAt: DEMO_NOW - (40 - i) * 86_400_000,
    approvalStatus: "approved", approvedAt: DEMO_NOW - (39 - i) * 86_400_000, approvedBy: "demo_admin",
    ...extra
  };
}

export function demoSeed() {
  const users = {}, attendance = {};
  for (let i = 1; i <= 30; i++) users[`demo_u${i}`] = person(i);
  // 신청 대기 3명, 보류 1명
  for (let i = 31; i <= 34; i++) users[`demo_u${i}`] = person(i, { approvalStatus: i === 34 ? "hold" : "pending", approvalNote: i === 34 ? "소속 확인 필요" : "", approvedAt: undefined, approvedBy: undefined, createdAt: DEMO_NOW - (35 - i) * 3_600_000 });
  // 시연 참가자 본인: 1·2강 출석, 3강은 시연 중 QR로 출석
  users[DEMO_ACCOUNTS.p.uid] = person(0, { name: "시연 참가자", region: "부산", orgRegion: "부산", orgCouncil: "북구협의회", memberType: "일반 청년", memberVerified: "", mode: "onsite", no: "BS27-DEMO00", email: DEMO_ACCOUNTS.p.email });
  const at = n => Date.parse(`${LECTURES[n - 1].date}T${LECTURES[n - 1].start}:00+09:00`) + 10 * 60_000;
  for (const [uid, u] of Object.entries(users)) {
    if (u.approvalStatus !== "approved") continue;
    const k = Number(uid.replace(/\D/g, "")) || 0;
    for (const n of [1, 2]) if (uid === DEMO_ACCOUNTS.p.uid || (k + n) % 7 !== 0) attendance[`${n}_${uid}`] = { uid, lecture: n, method: u.mode === "online" ? "online" : "qr", at: at(n), by: u.mode === "online" ? undefined : "demo_admin" };
    if (uid !== DEMO_ACCOUNTS.p.uid && k % 2 === 0) attendance[`3_${uid}`] = { uid, lecture: 3, method: u.mode === "online" ? "online" : "qr", at: at(3), by: "demo_admin" };
  }
  const scores = {};
  TEAMS.slice(0, 6).forEach((team, i) => {
    scores[`예선_${team}_demo_judge`] = { round: "예선", team, judge: "demo_judge", at: DEMO_NOW, crit: Object.fromEntries(CRITERIA.map((c, j) => [c.k, 6 + ((i + j) % 4)])) };
  });
  return {
    me: null,
    staff: {
      [DEMO_ACCOUNTS.a.uid]: { label: "시연 관리자", role: "admin" },
      demo_staff: { label: "시연 운영진", role: "staff" },
      [DEMO_ACCOUNTS.j.uid]: { label: "시연 심사위원", role: "judge" }
    },
    users, attendance, deepApps: {}, scores,
    notices: [
      { id: "n1", title: "[내일 3강] 북한 바로알기: 북한이탈 청년과의 대화", body: "내일 14:00 시작입니다. 앱의 QR 수강증을 준비해 주세요.", audience: "all", at: DEMO_NOW - 19 * 3_600_000 },
      { id: "n2", title: "[다시보기] 2강 요약 자료 안내", body: "지난 강의 요약 자료가 올라왔어요. 다시보기는 출석으로 인정되지 않아요.", audience: "all", at: DEMO_NOW - 9 * 86_400_000 }
    ],
    questions: [
      { id: "demo_u4_q1", uid: "demo_u4", text: "심화과정 교통비는 어떻게 지원되나요?", status: "open", at: DEMO_NOW - 2 * 3_600_000 },
      { id: "demo_u7_q1", uid: "demo_u7", text: "온라인 출석은 언제부터 누를 수 있나요?", status: "answered", answer: "강의 시작 30분 전부터 끝난 뒤 1시간까지 누를 수 있어요.", answeredBy: "demo_admin", at: DEMO_NOW - 30 * 3_600_000, answeredAt: DEMO_NOW - 28 * 3_600_000 }
    ],
    onsiteStats: null,
    seeded: true
  };
}
