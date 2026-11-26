// ─────────────────────────────────────────────────────────────
// 부산 청년 평화학교 앱 설정
// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)의 firebaseConfig 값을 붙여 넣으세요.
// apiKey가 비어 있으면 앱은 "체험 모드"(이 기기에만 저장)로 동작합니다.
// 이 값들은 공개용 식별자이며, 데이터 보호는 firestore.rules가 담당합니다.
// ─────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyCnlr7phzPqBWBt1i_RhGGZUj6QhEgcxig",
  authDomain: "kdypoho.firebaseapp.com",
  projectId: "kdypoho",
  storageBucket: "kdypoho.firebasestorage.app",
  messagingSenderId: "701264486422",
  appId: "1:701264486422:web:a6a02a8e45d5a610fb5537"
};

export const APP = {
  name: "부산 청년 평화학교",
  org: "민주평화통일자문회의 부산지역회의",
  version: "1.2.1",
  year: 2027,
  privacyVersion: "2027-01",          // 개인정보 처리방침 버전 (바꾸면 재동의 안내)
  termsVersion: "2027-01",            // 이용약관 버전
  legalEffective: "2027-01-01",       // 처리방침·약관 시행일
  archiveUrl: "https://youtharchive.kr/",
  // 시험용 앱 설치 링크 (안드로이드 APK는 main에 올릴 때마다 자동 갱신)
  androidApk: "https://github.com/KDYPOHO/peace-school-busan/releases/download/test-latest/peace-school.apk",
  testGuide: "https://github.com/KDYPOHO/peace-school-busan/blob/main/docs/TESTING.md",
  contact: "민주평통 부산지역회의 사무처"
};

// 기본과정 (계획서 기준, 날짜는 KST)
export const LECTURES = [
  { n: 1, date: "2027-04-10", start: "14:00", end: "16:00", title: "입학식 및 「피란수도 부산이 말하는 평화」", tag: "입학식" },
  { n: 2, date: "2027-04-24", start: "14:00", end: "16:00", title: "분단체제와 한반도 정세 쉽게 읽기" },
  { n: 3, date: "2027-05-08", start: "14:00", end: "16:00", title: "북한 바로알기: 북한이탈 청년과의 대화" },
  { n: 4, date: "2027-05-22", start: "14:00", end: "16:00", title: "급변하는 국제정세와 한반도" },
  { n: 5, date: "2027-06-05", start: "14:00", end: "16:00", title: "청년이 만드는 평화: 아이디어 라운드 테이블", tag: "수료식" }
];
export const VENUE = "협력 대학 강당(안) · 온라인 동시 중계";
export const PASS_COUNT = 4;          // 5강 중 4강 이상 수료
export const ONSITE_CAP = 100;        // 현장 정원
export const DEEP = {
  title: "심화과정 · 부산 2박3일",
  dates: "2027. 8. 13.(금) ~ 8. 15.(일)",
  cap: 40,
  teams: 8,
  days: [
    { d: "1일차 8. 13.(금)", items: ["12:00 부산역 집결·등록", "13:00 현장교육 (재한유엔기념공원 외, 조별 2곳)", "16:30 숙소 체크인 및 휴식", "19:30 개회식 · 20:00~ 자유시간"] },
    { d: "2일차 8. 14.(토)", items: ["오전 평화 해커톤 (8팀)", "오후 자유시간 및 팀 활동", "저녁 프로그램 자율 참여"] },
    { d: "3일차 8. 15.(일)", items: ["본선 발표 및 심사 결과 발표", "청년 평화 선언 · 수료식", "부산역 해산"] }
  ]
};
export const TEAMS = ["1팀", "2팀", "3팀", "4팀", "5팀", "6팀", "7팀", "8팀"];
export const CRITERIA = [
  { k: "독창성", w: 30 }, { k: "실현 가능성", w: 30 }, { k: "평화 가치", w: 25 }, { k: "발표", w: 15 }
];
export const REGIONS = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "해외"];
export const DEEP_APPLY_UNTIL = "2027-06-20"; // 심화과정 지원 마감 (KST)
export const DEEP_STATUS = { submitted: "검토 중", selected: "선발", waitlist: "예비 선발", rejected: "미선발" };

// 개인정보 보호책임자 (개인정보 보호법 제31조) — 사무처 확정 후 반드시 실제 정보로 바꾸세요
export const PRIVACY_OFFICER = {
  title: "개인정보 보호책임자",
  name: "강동엽",
  dept: "민주평화통일자문회의 부산지역회의 사무처",
  phone: "(사무처 대표 전화 확정 후 기재)",
  email: "todaklife@gmail.com"
};
