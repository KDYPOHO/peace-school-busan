// 한국어·English 화면 전환
// 화면 코드는 한국어로 그대로 두고, 그려진 화면의 글자를 영어 사전으로 바꿔 보여 준다.
// 참가자가 입력한 내용(이름, 문의, 공지 본문)과 고유명사(협의회 이름)는 바꾸지 않는다.

const KEY = "psb_lang";
const store = {
  get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
};

export function currentLang() {
  // 주소에 ?lang=ko 또는 ?lang=en 이 있으면 그 언어로 고정 (시험·안내 링크용)
  let q = null;
  try { q = new URLSearchParams(location.search).get("lang"); } catch (e) {}
  if (q === "ko" || q === "en") { if (store.get() !== q) store.set(q); return q; }
  const saved = store.get();
  if (saved === "ko" || saved === "en") return saved;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "ko";
  return /^ko/i.test(nav) ? "ko" : "en";
}

const WEEK = { 일: "Sun", 월: "Mon", 화: "Tue", 수: "Wed", 목: "Thu", 금: "Fri", 토: "Sat" };

// 정확히 일치하는 문구
const EN = {
  "자문위원": "NUAC advisory member",
  "청년 서포터즈·추천 청년": "Youth supporter / recommended youth",
  "일반 청년": "General youth",
  "제22기": "22nd term",
  "제21기": "21st term",
  "인증됨": "Verified",
  "인증 대기": "Pending verification",
  "자문위원 · 인증 반려": "Advisory member · not verified",
  "자문위원 · 인증 대기": "Advisory member · pending verification",
  "자문위원 기수": "Advisory term",
  "위촉 번호 (선택)": "Appointment no. (optional)",
  "위촉장 번호": "Appointment certificate no.",
  "닫기": "Close",
  "시험용": "Test",
  "개발용": "Dev",
  "예선": "Preliminary",
  "본선": "Final",
  "홈": "Home",
  "일정": "Schedule",
  "출석": "Attendance",
  "도우미": "Helper",
  "내 정보": "My info",
  "현황": "Overview",
  "참가자": "Participants",
  "공지·문의": "Notices",
  "심화": "Advanced",
  "심사": "Judging",
  "민주평통 심벌": "NUAC symbol",
  "앱 알림함": "Notifications",
  "화면 구분": "View",
  "운영진": "Staff",
  "메뉴": "Menu",
  "QR을 표시하지 못했어요.": "Couldn't show the QR code.",
  "아래 수강번호를 운영진에게 알려 주세요.": "Tell staff the enrollment number below.",
  "민주평통 청년운영위원회": "NUAC Youth Steering Committee",
  "청년아카이브 바로가기": "Open the Youth Archive",
  "행사 기록, 토론, 멤버 활동을 한곳에서 볼 수 있어요": "Event records, discussions and member activities in one place",
  "공지": "Notices",
  "문의 답변": "Inquiry replies",
  "읽음 상태를 저장하지 못했어요. 연결 후 다시 열어 주세요.": "Couldn't save read status. Reconnect and open again.",
  "알림함": "Notifications",
  "일부 알림을 불러오지 못했어요.": "Some notifications couldn't be loaded.",
  "다시 시도": "Try again",
  "받은 알림이 없어요.": "No notifications yet.",
  "이메일 형식을 확인해 주세요.": "Check the email format.",
  "비밀번호를 입력해 주세요.": "Enter your password.",
  "비밀번호는 6자 이상으로 정해 주세요.": "Use at least 6 characters for the password.",
  "이미 가입된 이메일이에요. 로그인해 주세요.": "This email is already registered. Please sign in.",
  "이메일 또는 비밀번호가 맞지 않아요.": "Email or password is incorrect.",
  "가입되지 않은 이메일이에요. 회원가입을 눌러 주세요.": "This email isn't registered. Tap Sign up.",
  "시도가 너무 많아요. 잠시 뒤 다시 해 주세요.": "Too many attempts. Try again in a moment.",
  "인터넷 연결을 확인해 주세요.": "Check your internet connection.",
  "로그인 창이 닫혔어요.": "The sign-in window was closed.",
  "보안을 위해 다시 로그인한 뒤 시도해 주세요.": "For security, sign in again and retry.",
  "문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.": "Something went wrong. Try again in a moment.",
  "민주평화통일자문회의": "National Unification Advisory Council",
  "민주평화통일자문회의 부산지역회의": "NUAC Busan Regional Council",
  "계정 및 데이터 삭제": "Delete account and data",
  "회원가입": "Sign up",
  "로그인": "Sign in",
  "삭제하려는 계정으로 로그인한 뒤 삭제를 확인해 주세요.": "Sign in with the account you want to delete, then confirm.",
  "이메일과 비밀번호로 계정을 만든 뒤 수강 신청서를 작성해요.": "Create an account with email and password, then fill in the application.",
  "수강 신청, QR 출석, 수료증을 앱 하나로 관리해요.": "Sign up, check in by QR and get your certificate, all in one app.",
  "이메일": "Email",
  "비밀번호": "Password",
  "(6자 이상)": "(6+ characters)",
  "비밀번호 확인": "Confirm password",
  "가입하기": "Create account",
  "Google 계정으로 계속하기": "Continue with Google",
  "앱으로 돌아가기": "Back to the app",
  "이미 계정이 있어요": "I already have an account",
  "처음이에요 · 회원가입": "New here · Sign up",
  "비밀번호 찾기": "Forgot password",
  "서버에 연결할 수 없어요. 연결을 확인한 뒤 페이지를 다시 열어 주세요.": "Can't reach the server. Check your connection and reopen the page.",
  "체험 모드: 이 기기에만 저장돼요. 아무 이메일로나 들어가 볼 수 있어요.": "Demo mode: data stays on this device. Any email works.",
  "개인정보 처리방침": "Privacy policy",
  "이용약관": "Terms of use",
  "앱 접근권한": "App permissions",
  "비밀번호를 재설정할 이메일을 먼저 적어 주세요.": "Enter the email to reset first.",
  "재설정 메일을 보냈어요. 메일함을 확인해 주세요.": "Reset email sent. Check your inbox.",
  "서버 연결이 필요해요.": "A server connection is required.",
  "비밀번호는 6자 이상이에요.": "Passwords are at least 6 characters.",
  "비밀번호 확인이 일치하지 않아요.": "Passwords don't match.",
  "잠시만요…": "One moment…",
  "앱 접근권한 안내": "About app permissions",
  "Google 계정으로 가입하셨다면 웹에서 본인 확인을 마쳐 주세요.": "If you signed up with Google, verify yourself on the web.",
  "웹에서 계정 삭제": "Delete account on the web",
  "현재 비밀번호": "Current password",
  "로그인 계정과 수강 신청, 출결, 문의, 알림 읽음 상태, 심화과정 지원 기록을 삭제합니다. 삭제한 기록은 되돌릴 수 없습니다.": "Deletes your sign-in account, application, attendance, inquiries, notification read status and advanced course application. This can't be undone.",
  "Google 본인 확인 후 삭제": "Verify with Google and delete",
  "계정 삭제": "Delete account",
  "계정과 해당 기록을 삭제했어요.": "Your account and records were deleted.",
  "삭제 완료를 확인하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.": "Couldn't confirm the deletion. Check your connection and retry.",
  "가입 승인 대기": "Waiting for approval",
  "신청서를 접수했어요. 운영진이 승인하면 평화학교를 이용할 수 있어요.": "Application received. You can use the Peace School once staff approve it.",
  "승인 상태 확인": "Check approval status",
  "다른 계정으로 로그인": "Sign in with another account",
  "수강 신청": "Course application",
  "기본과정": "Basic course",
  "1. 기본 정보": "1. Basic info",
  "수료증에 이 이름이 그대로 들어가요.": "This name appears on your certificate.",
  "이름": "Name",
  "출생연도": "Birth year",
  "선택": "Select",
  "휴대폰 번호 (선택)": "Mobile number (optional)",
  "2. 소속과 참여 방식": "2. Affiliation and participation",
  "거주 지역": "Region of residence",
  "민주평통 소속 지역회의": "NUAC regional council",
  "국내": "Korea",
  "해외": "Overseas",
  "체험 모드": "demo mode",
  "인터넷이 없어도 입구에서 이 QR을 보여 주면 돼요.": "Show this QR at the entrance even without internet.",
  "같은 수강번호가 여러 명이에요. QR로 출석하거나 참가자 탭에서 이름을 눌러 처리해 주세요.": "Several people share this number. Use their QR, or tap their name in Participants.",
  "부산 청년 과정": "Busan Youth Course",
  "2027 부산 청년 과정 기본과정": "2027 Busan Youth Course · Basic",
  "실시간 순위": "Live ranking",
  "참가 구분": "Participant type",
  "소속 (학교·직장, 선택)": "School or workplace (optional)",
  "예: 부산대학교": "e.g. Pusan National University",
  "참여 방식": "Participation",
  "부산 현장": "In person (Busan)",
  "온라인": "Online",
  "· 두 방식 모두 출석으로 인정돼요.": "· Both count as attendance.",
  "3. 동의와 확인": "3. Consent and review",
  "아래 내용으로 신청해요.": "You're applying with these details.",
  "지역": "Region",
  "민주평통": "NUAC",
  "구분": "Type",
  "(가입 후 운영진 인증)": "(verified by staff after sign-up)",
  "소속": "Affiliation",
  "참여": "Participation",
  "아래 내용에 모두 동의합니다": "I agree to all of the below",
  "[필수] 이용약관 동의": "[Required] Agree to the terms of use",
  "보기": "View",
  "[필수] 개인정보 수집·이용 동의": "[Required] Consent to collection and use of personal data",
  "필수 동의 내용 보기": "View required consent",
  "[필수] 만 19세~39세 청년이며, 입력한 정보가 사실입니다.": "[Required] I am aged 19–39 and the information is true.",
  "[선택] 휴대폰 번호·소속 수집·이용 동의": "[Optional] Consent to collect mobile number and affiliation",
  "선택 동의 내용 보기": "View optional consent",
  "[선택] 행사 사진·영상 촬영 및 활용 동의": "[Optional] Consent to event photos and videos",
  "사진 동의 내용 보기": "View photo consent",
  "에 있어요.": ".",
  "이전": "Back",
  "다음": "Next",
  "신청 완료": "Submit application",
  "이름을 적어 주세요.": "Enter your name.",
  "출생연도를 골라 주세요.": "Choose your birth year.",
  "휴대폰 번호 형식을 확인해 주세요. 예: 010-1234-5678": "Check the mobile number format, e.g. 010-1234-5678",
  "해당 없음": "None",
  "해당 없음 (일반 청년)": "None (general youth)",
  "소속 협의회를 골라 주세요.": "Choose your council.",
  "참가 구분을 골라 주세요.": "Choose a participant type.",
  "거주 지역을 골라 주세요.": "Choose your region.",
  "[필수] 항목 세 가지에 동의해 주세요.": "Agree to the three required items.",
  "신청 중…": "Submitting…",
  "선택 동의를 하지 않아 휴대폰 번호와 소속은 저장하지 않았어요": "Without optional consent, mobile number and affiliation weren't saved",
  "신청서를 저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.": "Couldn't save the application. Check your connection and try again.",
  "소속 협의회": "Council",
  "소속 협의회 (예: 뉴욕협의회)": "Council (e.g. New York Council)",
  "운영진 답변": "Staff reply",
  "오늘": "Today",
  "출석 가능": "Check-in open",
  "다음 강의": "Next session",
  "온라인 참여": "Online",
  "현장 참여": "In person",
  "출석 완료": "Checked in",
  "출석 기록 없음": "No attendance",
  "출석 예정": "Upcoming",
  "온라인 출석": "Online check-in",
  "온라인 출석 대기": "Online check-in soon",
  "출석 일정 확인 중": "Checking schedule",
  "QR 수강증": "QR pass",
  "전체 일정": "Full schedule",
  "기본과정 종료": "Basic course finished",
  "수료증은 내 정보에서 볼 수 있어요.": "Your certificate is in My info.",
  "다음 기수에서 다시 만나요.": "See you in the next cohort.",
  "수료 요건": "Completion",
  "수료 요건 충족": "Completed",
  "이번 기수 수료 어려움": "Can't complete this cohort",
  "남은 강의를 모두 들어야 수료할 수 있어요.": "You need every remaining session to complete.",
  "아직 공지가 없어요. 새 공지가 오면 종 모양에 점이 생겨요.": "No notices yet. A dot appears on the bell when one arrives.",
  "처리방침·약관이 바뀌었어요": "Privacy policy or terms changed",
  "확인 필요": "Review needed",
  "바뀐 내용을 확인해 주세요. 동의하지 않으면 내 정보에서 탈퇴할 수 있어요.": "Please review the changes. If you disagree, you can leave in My info.",
  "처리방침": "Privacy",
  "확인했어요": "Got it",
  "한국 시간 기준": "Korea time (KST)",
  "결석": "Absent",
  "예정": "Upcoming",
  "강연 80분과 라운드 테이블 40분으로 짧고 알차게 진행해요. 결석한 강의는 다시보기로 복습할 수 있지만 출석으로 인정되지는 않아요.": "Each session is an 80-minute talk and a 40-minute round table. Replays are available but don't count as attendance.",
  "팀": "teams",
  "개인 QR 수강증": "Personal QR pass",
  "출석용 QR 수강증": "QR pass for check-in",
  "수강번호 복사": "Copy enrollment no.",
  "입구에서 운영진에게 이 QR을 보여 주세요. 찍는 순간 출석이 기록돼요. 화면을 밝게 하면 더 잘 찍혀요.": "Show this QR to staff at the entrance. Attendance is recorded when it's scanned. A brighter screen scans better.",
  "✓ 오늘 출석 완료": "✓ Checked in today",
  "온라인으로 듣는 경우": "Joining online",
  "아래 버튼을 누르면 온라인 출석이 기록돼요. 운영진이 중계 접속 기록과 대조해요.": "Tap the button below to record online attendance. Staff check it against the stream log.",
  "온라인 출석하기": "Check in online",
  "강의 시간에 열려요": "Opens during the session",
  "내 출결": "My attendance",
  "수료 요건을 채웠어요.": "You've met the completion requirement.",
  "출석 문의하기": "Ask about attendance",
  "운영진에게 직접 문의": "Ask staff directly",
  "문의 내용": "Your question",
  "예: 2강 온라인 출석 내역을 확인해 주세요.": "e.g. Please check my online attendance for session 2.",
  "문의는 본인과 운영진만 볼 수 있어요. 비밀번호나 주민등록번호는 적지 마세요.": "Only you and staff can see inquiries. Don't include passwords or ID numbers.",
  "보내는 중…": "Sending…",
  "문의 보내기": "Send inquiry",
  "내 문의": "My inquiries",
  "문의 내역을 불러오지 못했어요. 연결을 확인한 뒤 앱을 다시 열어 주세요.": "Couldn't load inquiries. Check your connection and reopen the app.",
  "답변 완료": "Answered",
  "답변 대기": "Awaiting reply",
  "보낸 문의와 운영진 답변을 여기에서 확인할 수 있어요.": "Your inquiries and staff replies appear here.",
  "학습 도우미": "Learning helper",
  "공식 안내 기반 · 무료": "Official guide · free",
  "운영진에게 물어보기": "Ask staff",
  "수료, 일정, 출석, 심화과정 등을 물어보세요": "Ask about completion, schedule, attendance, the advanced course…",
  "질문": "Question",
  "보내기": "Send",
  "연락처": "Contact",
  "선택 동의": "Optional consent",
  "동의": "agreed",
  "미동의": "not agreed",
  "정보 수정 · 동의 변경": "Edit info · consent",
  "수료증": "Certificate",
  "발급 완료": "Issued",
  "발급 예정": "Not yet issued",
  "미리보기": "Preview",
  "인쇄하거나 PDF로 저장할 수 있어요.": "You can print it or save it as PDF.",
  "수료증 인쇄 · PDF 저장": "Print · save as PDF",
  "표시 설정": "Display",
  "큰 글씨": "Large text",
  "글자를 키워 읽기 편하게": "Bigger text for easier reading",
  "화면 테마": "Theme",
  "자동": "Auto",
  "밝게": "Light",
  "어둡게": "Dark",
  "언어": "Language",
  "휴대폰 앱으로 시험하기": "Try the mobile app",
  "안드로이드는 아래 파일을 받아 설치하면 돼요. 아이폰은 운영진이 TestFlight로 초대해 드려요.": "On Android, download and install the file below. For iPhone, staff will invite you via TestFlight.",
  "안드로이드 APK 받기": "Download Android APK",
  "설치 방법": "How to install",
  "앱 정보": "About",
  "버전": "Version",
  "(앱)": "(app)",
  "(웹)": "(web)",
  "· 체험 모드": "· demo mode",
  "운영": "Operator",
  "계정 ID": "Account ID",
  "복사": "Copy",
  "내 정보 내려받기": "Download my data",
  "로그아웃": "Sign out",
  "회원 탈퇴": "Leave and delete account",
  "지난 강의 평균 출석률": "Average attendance",
  "참가자 문의": "Participant inquiries",
  "문의함 열기": "Open inbox",
  "주의가 필요한 참가자": "Participants needing attention",
  "자동 계산": "Auto",
  "명단 보기": "View list",
  "독려 공지 쓰기": "Write a reminder",
  "소속별 신청": "Applications by council",
  "지역회의 기준": "By regional council",
  "자문위원 인증 대기": "Advisor verification pending",
  "아직 신청자가 없어요.": "No applications yet.",
  "강별 출석": "Attendance by session",
  "자료 내보내기": "Export",
  "엑셀에서 바로 열리는 명단과, 숫자가 채워진 결과보고서 초안을 만들어요.": "Creates an Excel-ready list and a draft results report with the numbers filled in.",
  "참가자·출결 명단 (CSV)": "Participants & attendance (CSV)",
  "결과보고서 초안": "Draft results report",
  "해제": "Remove",
  "나": "Me",
  "새 운영진은 그 사람이 앱에 먼저 가입한 뒤, 참가자 탭에서 이름을 눌러 지정해요. 가입서를 안 쓴 사람은 내 정보의 계정 ID로 추가해요.": "New staff sign up first, then you tap their name in Participants. For someone without an application, add them by the account ID in their My info.",
  "계정 ID 붙여넣기": "Paste account ID",
  "운영진 계정 ID": "Staff account ID",
  "추가": "Add",
  "가입 승인": "Approve sign-up",
  "확인할 가입 신청이 없어요.": "No sign-ups to review.",
  "이름, 수강번호, 소속, 지역 검색": "Search name, enrollment no., council, region",
  "참가자 검색": "Search participants",
  "소속 지역회의로 거르기": "Filter by regional council",
  "모든 소속": "All councils",
  "전체": "All",
  "수료 위험": "At risk",
  "수료 불가": "Can't complete",
  "현장": "In person",
  "· 운영진": "· staff",
  "조건에 맞는 참가자가 없어요.": "No matching participants.",
  "회차별 출석": "Attendance by session",
  "강의 선택": "Choose session",
  "QR 출석": "QR check-in",
  "카메라를 켜고 참가자의 QR 수강증을 화면 중앙에 맞춰 주세요.": "Turn on the camera and center the participant's QR pass.",
  "카메라 켜기": "Turn on camera",
  "수강번호 (예: BS27-AB12CD)": "Enrollment no. (e.g. BS27-AB12CD)",
  "수강번호": "Enrollment no.",
  "직접 출석": "Check in manually",
  "최근 출석": "Recent check-ins",
  "참가자 문의함": "Inquiry inbox",
  "문의 목록을 불러오지 못했어요. 연결과 운영진 계정을 확인해 주세요.": "Couldn't load inquiries. Check your connection and staff account.",
  "답변": "Reply",
  "다시 보내기": "Send again",
  "답변 보내기": "Send reply",
  "답변을 기다리는 문의가 없어요.": "No inquiries awaiting a reply.",
  "답변한 문의가 없어요.": "No answered inquiries.",
  "문의 더 보기": "More inquiries",
  "공지 올리기": "Post a notice",
  "받는 사람": "Audience",
  "제목": "Title",
  "내용": "Body",
  "강의 전날 안내": "Day-before reminder",
  "다시보기 안내": "Replay notice",
  "수료 독려": "Completion reminder",
  "공지는 참가자 앱 첫 화면과 공지함에 바로 보여요. 휴대폰 푸시 알림은 2단계에서 붙일 예정이에요.": "Notices appear right away on the participant home screen and in notifications.",
  "올린 공지": "Posted notices",
  "심화 선발자": "Advanced course selectees",
  "삭제": "Delete",
  "아직 올린 공지가 없어요.": "No notices posted yet.",
  "심화과정 선발": "Advanced course selection",
  "검토 중": "Under review",
  "선발": "Selected",
  "예비": "Waitlist",
  "미선발": "Not selected",
  "탈퇴한 참가자": "Former participant",
  "분야 미선택": "No field chosen",
  "제출": "Submitted",
  "보류": "On hold",
  "아직 지원서가 없어요.": "No applications yet.",
  "해커톤 심사": "Hackathon judging",
  "운영진 계정마다 한 명의 심사위원으로 집계돼요. 점수를 바꾸면 순위가 바로 다시 계산돼요.": "Each staff account counts as one judge. Rankings update as soon as scores change.",
  "내 점수 합계": "My total",
  "점수 고쳐 저장": "Update scores",
  "점수 저장": "Save scores",
  "자동 집계": "Auto tally",
  "순위": "Rank",
  "평균": "Average",
  "예선 상위 4팀이 본선에 올라가요.": "The top 4 teams advance to the final.",
  "본선 결과는 이 표를 발표 화면에 띄우면 돼요.": "Show this table on screen to announce the final.",
  "지원서 고치기": "Edit application",
  "축하해요! 세부 일정과 준비물은 공지로 안내해 드려요.": "Congratulations! Details and what to bring will come in a notice.",
  "지원 일정 확인 중": "Checking dates",
  "지원이 마감됐어요": "Applications closed",
  "심화과정 지원하기": "Apply for the advanced course",
  "지원 마감": "Deadline",
  "(한국 시간)": "(KST)",
  "지원 일정을 확인해 주세요.": "Please check the application dates.",
  "심화과정 지원서": "Advanced course application",
  "관심 분야": "Field of interest",
  "교육·콘텐츠": "Education & content",
  "지역 연계": "Local partnership",
  "국제·외교": "International & diplomacy",
  "미디어": "Media",
  "사회 통합": "Social integration",
  "기타": "Other",
  "해커톤에서 해보고 싶은 것 (100~800자)": "What you'd like to try at the hackathon (100–800 characters)",
  "부산 도착 예정": "Arrival in Busan",
  "8. 13.(금) 11시 집결 전 도착": "Before the 11:00 meet-up on Fri 8/13",
  "8. 13.(금) 11시 이후 도착 (늦게 합류)": "After 11:00 on Fri 8/13 (joining late)",
  "부산·경남 거주 (직접 이동)": "Live in Busan/Gyeongnam (own travel)",
  "아직 모름": "Not sure yet",
  "2박3일 전 일정에 참여할 수 있으며, 선발 후 불참 시 다음 예비자에게 기회가 넘어가는 데 동의합니다.": "I can attend all 3 days, and agree my place goes to the next waitlisted person if I drop out.",
  "고친 내용 저장": "Save changes",
  "지원서 제출": "Submit application",
  "참여 확인에 동의해 주세요.": "Please confirm you can attend.",
  "지원서를 저장했어요. 결과는 앱 공지로 알려드려요.": "Application saved. Results will be announced in the app.",
  "저장했어요": "Saved",
  "저장하지 못했어요. 다시 시도해 주세요.": "Couldn't save. Please try again.",
  "이 기기에서는 인쇄를 열 수 없어요. 화면을 캡처해 보관해 주세요.": "Printing isn't available here. Take a screenshot to keep it.",
  "정보 수정": "Edit info",
  "이름 (수료증 표기)": "Name (as on certificate)",
  "[선택] 휴대폰 번호·소속 수집·이용 동의 (끄면 두 정보가 즉시 지워져요)": "[Optional] Mobile number & affiliation consent (turning off deletes both)",
  "휴대폰 번호": "Mobile number",
  "저장": "Save",
  "선택 동의를 끄면 휴대폰 번호와 소속이 지워져요. 맞으면 저장을 한 번 더 눌러 주세요.": "Turning off optional consent deletes your mobile number and affiliation. Tap Save again to confirm.",
  "휴대폰 번호 형식을 확인해 주세요.": "Check the mobile number format.",
  "민주평통 소속": "NUAC council",
  "자문위원 인증": "Advisor verification",
  "참여방식": "Participation",
  "출석 수": "Sessions attended",
  "수료": "Completed",
  "심화 지원": "Advanced applications",
  "심화 결과": "Advanced result",
  "사진 동의": "Photo consent",
  "신청일": "Applied",
  "수동": "Manual",
  "인증": "Verified",
  "반려": "Rejected",
  "대기": "Pending",
  "명단을 복사했어요. 엑셀에 붙여 넣으세요.": "List copied. Paste it into Excel.",
  "소속 없음(일반 청년)": "No council (general youth)",
  "앱에 쌓인 숫자로 채운 초안이에요. 복사해서 한글 문서에 붙여 넣으세요.": "A draft filled with the app's numbers. Copy it into your document.",
  "복사했어요": "Copied",
  "내 정보를 내려받았어요": "Your data was downloaded",
  "길게 눌러 직접 복사해 주세요": "Long-press to copy",
  "출생": "Born",
  "미지원": "Not applied",
  "출결 (눌러서 수동 처리)": "Attendance (tap to edit)",
  "출석 취소": "Undo check-in",
  "출석 처리": "Mark present",
  "휴대폰 분실, 중계 접속 확인 등 예외 상황에만 쓰세요. 처리한 운영진이 함께 기록돼요.": "Use only for exceptions such as a lost phone or a stream check. Your staff account is recorded.",
  "자문위원 명단과 이름·소속이 맞는지 확인한 뒤 눌러 주세요.": "Check the name and council against the advisory member list first.",
  "인증 취소": "Revoke",
  "명단에 없음 (반려)": "Not on list (reject)",
  "운영진으로 지정": "Make staff",
  "인증을 반려했어요": "Verification rejected",
  "인증을 취소했어요": "Verification revoked",
  "처리하지 못했어요": "Couldn't complete",
  "운영진으로 지정할까요?": "Make this person staff?",
  "지정하기": "Make staff",
  "운영진으로 지정했어요": "Added as staff",
  "지정하지 못했어요": "Couldn't add as staff",
  "카메라 끄기": "Turn off camera",
  "카메라 준비 중…": "Starting camera…",
  "카메라 접근권한 안내": "About camera access",
  "참가자의 QR 수강증을 읽을 때만 카메라를 사용해요. 영상은 저장하거나 전송하지 않아요.": "The camera is used only to read participants' QR passes. Video isn't saved or sent.",
  "수강번호로도 출석을 처리할 수 있어요. 카메라 권한은 휴대폰 설정에서 바꿀 수 있어요.": "You can also check in by enrollment number. Change camera access in phone settings.",
  "확인하고 카메라 켜기": "OK, turn on camera",
  "카메라를 열지 못했어요. 연결과 카메라 권한을 확인하거나 수강번호를 입력해 주세요.": "Couldn't open the camera. Check access or enter the enrollment number.",
  "평화학교 QR 수강증을 화면 중앙에 맞춰 주세요.": "Center the Peace School QR pass on screen.",
  "등록되지 않은 참가자예요. 수강 신청 여부를 확인해 주세요.": "Not a registered participant. Check their application.",
  "출석 저장 중…": "Saving check-in…",
  "출석을 저장하지 못했어요. 인터넷에 연결한 뒤 다시 시도해 주세요.": "Couldn't save the check-in. Connect and try again.",
  "아직 출석한 사람이 없어요.": "No one has checked in yet.",
  "현재 온라인 출석 가능 시간이 아니에요.": "Online check-in isn't open now.",
  "이미 출석이 기록됐어요.": "Already checked in.",
  "출석 저장 완료": "Check-in saved",
  "서버에서 온라인 출석을 허용하지 않았어요. 강의 일정과 기기의 날짜·시간을 확인해 주세요.": "The server didn't accept the online check-in. Check the session time and your device clock.",
  "저장하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.": "Couldn't save. Check your connection and retry.",
  "저장하지 못했어요": "Couldn't save",
  "수강번호를 복사했어요": "Enrollment no. copied",
  "문의 내용을 적어 주세요.": "Write your question.",
  "문의가 접수됐어요. 내 문의에서 답변을 확인할 수 있어요.": "Inquiry received. Replies appear in My inquiries.",
  "문의를 보내지 못했어요. 인터넷을 확인하고 다시 보내 주세요.": "Couldn't send. Check your connection and send again.",
  "전달하지 못했어요": "Couldn't send",
  "계정 ID를 복사했어요": "Account ID copied",
  "로그아웃할까요?": "Sign out?",
  "다시 들어오려면 이메일과 비밀번호가 필요해요.": "You'll need your email and password to sign back in.",
  "남은 강의를 모두 출석해야 수료할 수 있어요.": "Attend every remaining session to complete.",
  "[수료 안내] 남은 강의를 꼭 챙겨 주세요": "[Completion] Don't miss the remaining sessions",
  "남은 강의를 모두 들으면 수료할 수 있어요. 현장 참석이 어렵다면 온라인 출석도 인정돼요.": "Attend all remaining sessions to complete. Online attendance also counts.",
  "운영진에서 해제할까요?": "Remove from staff?",
  "이 계정은 더 이상 운영진 화면을 쓸 수 없어요.": "This account will lose staff access.",
  "해제했어요": "Removed",
  "해제하지 못했어요": "Couldn't remove",
  "계정 ID 형식이 아니에요": "Not a valid account ID",
  "운영진으로 추가했어요": "Added as staff",
  "추가하지 못했어요": "Couldn't add",
  "가입을 승인할까요?": "Approve this sign-up?",
  "승인하기": "Approve",
  "가입을 승인했어요": "Sign-up approved",
  "이미 처리된 신청이에요": "Already processed",
  "가입을 승인하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.": "Couldn't approve. Check your connection and retry.",
  "수강번호를 찾지 못했어요. 번호를 확인해 주세요.": "Enrollment number not found. Please check it.",
  "제목과 내용을 적어 주세요": "Enter a title and body",
  "공지를 올렸어요": "Notice posted",
  "올리지 못했어요": "Couldn't post",
  "공지를 지울까요?": "Delete this notice?",
  "참가자 앱에서도 바로 사라져요.": "It disappears from the participant app right away.",
  "지웠어요": "Deleted",
  "지우지 못했어요": "Couldn't delete",
  "답변 내용을 적어 주세요.": "Write a reply.",
  "참가자에게 답변을 보냈어요.": "Reply sent.",
  "다른 운영진이 먼저 답변했어요. 답변 완료 목록을 확인해 주세요.": "Another staff member already replied. Check Answered.",
  "답변을 보내지 못했어요. 입력한 답변을 확인하고 다시 시도해 주세요.": "Couldn't send the reply. Check it and retry.",
  "바꾸지 못했어요": "Couldn't change",
  "점수를 저장했어요": "Scores saved",
  "삭제 계속하기": "Continue deleting",
  "불러오는 중…": "Loading…",
  "연결을 확인한 뒤 승인 상태를 다시 확인해 주세요.": "Check your connection, then check approval status again.",
  "출석이 기록됐어요": "Attendance recorded",
  "오프라인 · 저장하려면 연결 후 다시 시도해 주세요.": "Offline · reconnect to save.",
  "서버에 연결하지 못했어요": "Couldn't reach the server",
  "인터넷 연결을 확인한 뒤 다시 시도해 주세요.": "Check your internet connection and retry.",
  "서버 연결 중…": "Connecting…",
  "로컬 Firebase 연결": "Connect local Firebase",
  "이 기기에서 체험": "Try on this device",
  "한반도 평화학교": "Hanbando Peace School",
  "평화학교": "Peace School",
  "확인": "OK",
  "취소": "Cancel",
  "수정": "Edit",
  "가입 신청": "Sign-ups",
  "체험 운영진": "Demo staff",
  "피란수도 부산이 말하는 평화": "Peace as told by Busan, the wartime capital",
  "입학식": "Opening",
  "수료식": "Completion ceremony",
  "협력 대학 강당(안)": "Partner university hall (TBC)",
  "온라인 동시 중계": "Live-streamed online",
  "입학식 및 「피란수도 부산이 말하는 평화」": "Opening & “Peace as told by Busan, the wartime capital”",
  "분단체제와 한반도 정세 쉽게 읽기": "Understanding division and the Korean Peninsula",
  "북한 바로알기: 북한이탈 청년과의 대화": "Knowing North Korea: talk with young defectors",
  "급변하는 국제정세와 한반도": "A shifting world and the Korean Peninsula",
  "청년이 만드는 평화: 아이디어 라운드 테이블": "Peace made by youth: idea round table",
  "심화과정 · 부산 2박3일": "Advanced course · Busan, 3 days",
  "기본과정 5강": "Basic course · 5 sessions",
  // 1.5.0: 권한 3단계, 가입 결정, 현장 대기, 강의 알림, 시연 모드
  "시연용 · 가상 자료": "Demo · sample data",
  "시연 화면 들어가기": "Enter the demo",
  "시연 첫 화면으로 돌아가요.": "You will return to the demo start screen.",
  "모든 이름과 기록은 가상 자료이며 이 기기에만 저장돼요. 시연 시각은 2027. 5. 15.(토) 3강 진행 중으로 맞춰져 있어요.": "All names and records are sample data stored only on this device. The demo clock is set to 2027. 5. 15.(Sat), during Session 3.",
  "참가자로 보기": "View as participant",
  "관리자로 보기": "View as administrator",
  "심사위원으로 보기": "View as judge",
  "시연 자료 처음 상태로": "Reset demo data",
  "시연 자료를 처음 상태로 되돌렸어요": "Demo data has been reset",
  "관리자": "Administrator",
  "심사위원": "Judge",
  "시연 관리자": "Demo administrator",
  "시연 운영진": "Demo staff",
  "시연 심사위원": "Demo judge",
  "역할": "Role",
  "역할 바꾸기": "Change role",
  "관리자: 운영진 지정·해제와 모든 업무 · 운영진: 출석·공지·문의·선발·심사 · 심사위원: 심사 화면만 (참가자 정보 열람 불가)": "Administrator: appoints staff and does everything · Staff: attendance, notices, inquiries, selection, judging · Judge: judging screen only (no access to participant data)",
  "새 운영진은 그 사람이 앱에 먼저 가입한 뒤, 참가자 탭에서 이름을 눌러 지정해요. 외부 심사위원처럼 가입서를 안 쓴 사람은 계정 ID로 추가해요.": "To appoint staff, have them sign up first, then tap their name in the People tab. People without an application, such as outside judges, are added by account ID.",
  "운영진 지정·해제는 관리자만 할 수 있어요.": "Only administrators can appoint or remove staff.",
  "심사위원으로 지정": "Appoint as judge",
  "심사위원으로 지정했어요": "Appointed as judge",
  "심사위원으로 지정할까요?": "Appoint as judge?",
  "관리자로 바꿀까요?": "Make administrator?",
  "관리자는 다른 운영진을 지정하고 해제할 수 있어요.": "Administrators can appoint and remove other staff.",
  "바꾸기": "Change",
  "전체 선택": "Select all",
  "승인": "Approve",
  "선택 승인": "Approve selected",
  "선택 보류": "Hold selected",
  "선택 반려": "Decline selected",
  "신청자 화면에 보일 사유를 골라 주세요.": "Choose the reason the applicant will see.",
  "참가 대상 연령이 아님": "Outside the eligible age range",
  "신청 정보가 사실과 다름": "Application details are incorrect",
  "중복 신청": "Duplicate application",
  "기타 (사무처 문의)": "Other (contact the secretariat)",
  "소속 확인 필요": "Affiliation needs checking",
  "연락처 확인 필요": "Contact details need checking",
  "기타 확인 필요": "Other details need checking",
  "가입이 반려되었어요": "Your application was declined",
  "운영진이 신청서를 확인한 결과 이번 기수에는 참여가 어려워요. 궁금한 점은 사무처로 문의해 주세요.": "After review, you can't join this cohort. Please contact the secretariat with any questions.",
  "계정을 삭제하면 신청서도 함께 지워져요.": "Deleting your account also deletes your application.",
  "가입 확인 중 (보류)": "Application on hold",
  "운영진이 신청 내용을 확인하고 있어요. 확인이 끝나면 승인 여부가 이 화면에 표시돼요.": "Staff are checking your application. The decision will appear on this screen.",
  "현장 대기": "In-person waitlist",
  "현장 대기자": "In-person waitlist",
  "현장 확정": "Confirm seat",
  "온라인 전환": "Switch to online",
  "온라인으로 전환": "Switch to online",
  "온라인 참여로 바꿀까요?": "Switch to online participation?",
  "온라인 참여로 바꿨어요": "Switched to online",
  "승인 순서대로 보여요. 현장 자리가 나면 '현장 확정'을 눌러 주세요.": "Listed in order of approval. When a seat opens, tap 'Confirm seat'.",
  "현장 참여로 확정했어요. 공지나 문의 답변으로 알려 주세요.": "Seat confirmed. Let them know by notice or inquiry reply.",
  "현장 정원이 아직 차 있어요": "In-person seats are still full",
  "현장 정원 마감": "In-person seats full",
  "현장 정원이 찼어요": "In-person seats are full",
  "대기자로 바꾸기": "Join the waitlist",
  "현장 대기자로 승인했어요": "Approved on the in-person waitlist",
  "참가자 화면은 가입 승인 후에 쓸 수 있어요": "The participant screen is available after approval",
  "강의 알림": "Session reminders",
  "강의 전날 저녁 7시와 시작 1시간 전에 휴대폰 알림": "Phone reminder at 7 p.m. the day before and 1 hour before each session",
  "강의 알림을 켰어요": "Session reminders on",
  "강의 알림을 껐어요": "Session reminders off",
  "알림 권한이 없어 켜지 못했어요. 휴대폰 설정에서 알림을 허용해 주세요.": "Notifications aren't allowed. Allow them in your phone settings.",
  "공지는 참가자 앱 첫 화면과 공지함에 바로 보여요. 앱을 설치한 참가자는 강의 전날 저녁과 시작 1시간 전에 휴대폰 알림도 받아요(기기 자체 알림).": "Notices appear right away on the participant home screen and inbox. Participants using the app also get phone reminders the evening before and 1 hour before each session (on-device)."
};

// 숫자나 이름이 들어가는 문구
const RULES = [
  [/^(.+) 선택$/, "Select $1"],
  [/^(\d+)명 (승인|보류|반려)(.*)$/, (m, n, k, rest) => `${n} ${({ 승인: "approved", 보류: "put on hold", 반려: "declined" })[k]}${rest.replace(/현장 대기 (\d+)명/, "$1 waitlisted").replace(/(\d+)명 실패/, "$1 failed")}`],
  [/^(\d+)명을 승인할까요\?$/, "Approve $1 people?"],
  [/^(\d+)명 (보류|반려)$/, (m, n, k) => `${k === "보류" ? "Hold" : "Decline"} ${n}`],
  [/^현장 (\d+) \/ (\d+)명(?: · 현장 대기 (\d+)명)?\. 정원이 차면 현장 신청자는 대기자로 승인돼요\.$/, (m, a, b, w) => `In person ${a} / ${b}${w ? ` · waitlist ${w}` : ""}. When full, in-person applicants are approved onto the waitlist.`],
  [/^(관리자|운영진|심사위원)\(으\)로 (바꿨어요|추가했어요)$/, (m, r, k) => `${k === "바꿨어요" ? "Changed to" : "Added as"} ${({ 관리자: "administrator", 운영진: "staff", 심사위원: "judge" })[r]}`],
  [/^(\d+)강$/, "Session $1"],
  [/^기본과정 (\d+)강$/, "Basic course · Session $1"],
  [/^기본과정 (\d+)강 진행일$/, "Basic course · Session $1 today"],
  [/^오늘 · 기본과정 (\d+)강$/, "Today · Basic course · Session $1"],
  [/^다음 강의 · 기본과정 (\d+)강$/, "Next · Basic course · Session $1"],
  [/^다음 강의 (\d+)강 · (.+)$/, "Next session $1 · $2"],
  [/^(\d+)강 출석$/, "Session $1:"],
  [/^(\d+) ?\/ ?(\d+)강 출석$/, "$1 / $2 sessions attended"],
  [/^(\d+)강 더 필요$/, "$1 more needed"],
  [/^(\d+)강 현장 출석 · 개인 QR$/, "Session $1 in-person check-in · personal QR"],
  [/^수강번호 (.+)$/, "Enrollment no. $1"],
  [/^남은 강의 (\d+)회$/, "$1 sessions left"],
  [/^수료까지 (\d+)강 남았어요\.$/, "$1 more session(s) to complete."],
  [/^(\d+)강 중 (\d+)강 이상 출석하면 수료예요\. 현장·온라인 모두 인정되고, 수료하면 심화과정에 지원할 수 있어요\.$/, "Attend $2 of $1 sessions to complete. In-person and online both count, and completing lets you apply for the advanced course."],
  [/^(\d+)강 이상 출석하면 이 수료증이 발급돼요\.$/, "This certificate is issued after $1+ sessions."],
  [/^(\d+)강 출석 후 지원 가능$/, "Apply after attending $1 sessions"],
  [/^운영 현황 · (.+)$/, "Overview · $1"],
  [/^(\d+)강 출석 (\d+)명 \(현장 (\d+) · 온라인 (\d+)\)$/, "Session $1: $2 checked in ($3 in person · $4 online)"],
  [/^기본과정 신청 \((\d+)개 시·도\)$/, "Applications ($1 regions)"],
  [/^심화 지원 \/ 정원 (\d+)$/, "Advanced applications / $1 seats"],
  [/^답변 대기 (\d+)건$/, "$1 awaiting reply"],
  [/^자문위원 인증 대기 (\d+)$/, "Advisor pending $1"],
  [/^자문위원 인증 대기 (\d+)명$/, "$1 advisors pending verification"],
  [/^정원 (\d+)명$/, "$1 seats"],
  [/^정원 (\d+)명 · (\d+)팀$/, "$1 seats · $2 teams"],
  [/^(\d+)명$/, "$1 people"],
  [/^(\d+)명 · 수료 요건 (\d+)명$/, "$1 · $2 completed"],
  [/^안녕하세요, (.+)님\. 평화학교 도우미예요\. 공식 안내 범위 안에서 답하고, 모르는 건 운영진에게 바로 전달해 드려요\.$/, "Hi $1, I'm the Peace School helper. I answer from the official guide and pass anything else to staff."],
  [/^(.+)님, 수고 많으셨어요$/, "Well done, $1"],
  [/^연락처·소속 (.+) · 사진 (.+)$/, (m, a, b) => `Contact & affiliation ${tr(a)} · photo ${tr(b)}`],
  [/^(.+) \/ 3단계$/, "Step $1 of 3"],
  [/^대상: 만 19세~39세 청년 \((\d+)~(\d+)년생\)$/, "Eligible: ages 19–39 (born $1–$2)"],
  [/^(\d+)년$/, "$1"],
  [/^(\d+)년생$/, "born $1"],
  [/^자문위원 (제\d+기) · 인증됨$/, "Advisory member ($1) · verified"],
  [/^(.+)님을 자문위원으로 인증했어요$/, "$1 verified as an advisory member"],
  [/^(.+)님이 평화학교를 이용할 수 있게 돼요\.$/, "$1 will be able to use the Peace School."],
  [/^(.+)님 · (\d+)강 출석 완료$/, "$1 · session $2 checked in"],
  [/^(.+)님은 (\d+)강 출석이 이미 기록되어 있어요\.$/, "$1 is already checked in for session $2."],
  [/^수료 위험 (\d+)$/, "At risk $1"],
  [/^전체 참가자 \((\d+)명\)$/, "All participants ($1)"],
  [/^심화과정 선발자 \((\d+)명\)$/, "Advanced selectees ($1)"],
  [/^지원 마감 ([^가-힣]+)$/, "Deadline $1"],
  [/^(\d+)자$/, "$1 characters"],
  [/^(\S+지역회의) (\S+협의회)$/, (m, a, b) => `${tr(b)}, ${tr(a)}`],
  [/^민주평화통일자문회의 (\S+지역회의) (\S+협의회)$/, (m, a, b) => `NUAC ${tr(b)}, ${tr(a)}`],
  [/^민주평화통일자문회의 (\S+지역회의)$/, (m, a) => `NUAC ${tr(a)}`],
  [/^(\S+) \(웹\)$/, "$1 (web)"],
  [/^(\S+) \(앱\)$/, "$1 (app)"],
  [/^앱 알림함, 읽지 않은 알림 (\d+)건$/, "Notifications, $1 unread"],
  [/^답변 완료 (\d+)건$/, "Answered $1"],
  [/^실시간 순위$/, "Live ranking"],
  [/^지원 마감 (.+) \(한국 시간\)\. (.+)$/, (m, d, r) => `Deadline ${d} (KST). ${tr(r)}`],
  [/^정원 (\d+)명을 넘겨 선발할 수 없어요\. 지원 (\d+)건$/, "You can't select more than $1. Applications: $2"],
  [/^예비 (\d+)명\. 선발은 운영위원회가 직접 하고, 앱은 출석과 지원서를 나란히 보여 주기만 해요\.$/, "Waitlist: $1. The steering committee makes the selection; the app only shows attendance and applications side by side."],
  [/^강의 당일 (\d+:\d+) 30분 전부터 종료 1시간 뒤까지 아래 버튼을 누르면 온라인 출석이 기록돼요\. 운영진이 중계 접속 기록과 대조해요\.$/, "On session day, from 30 minutes before $1 until 1 hour after the end, tap the button below to record online attendance. Staff check it against the stream log."],
  [/^강의 당일 시작 30분 전부터 아래 버튼을 누르면 온라인 출석이 기록돼요\. 운영진이 중계 접속 기록과 대조해요\.$/, "On session day, from 30 minutes before the start, tap the button below to record online attendance. Staff check it against the stream log."]
];


// 일정·도우미·운영 화면에 더 쓰이는 문구
Object.assign(EN, {
  "11:00 부산역 집결·등록": "11:00 Meet and register at Busan Station",
  "13:00 현장교육 (재한유엔기념공원 외, 조별 2곳)": "13:00 Field study (UN Memorial Cemetery and more, 2 sites per group)",
  "16:30 숙소 체크인 및 휴식": "16:30 Check in and rest",
  "19:30 개회식": "19:30 Opening ceremony",
  "20:00~ 자유시간": "20:00~ Free time",
  "오전 평화 해커톤 (8팀)": "Morning: peace hackathon (8 teams)",
  "오후 자유시간 및 팀 활동": "Afternoon: free time and team work",
  "저녁 프로그램 자율 참여": "Evening: optional programs",
  "본선 발표 및 심사 결과 발표": "Final presentations and results",
  "청년 평화 선언": "Youth peace declaration",
  "부산역 해산": "Disband at Busan Station",
  "오후 자유시간과 자율 참여 저녁 프로그램으로 여유 있게 진행해요.": "A relaxed pace with free afternoons and optional evening programs.",
  "수료 조건이 뭐예요?": "How do I complete the course?",
  "내 출석 현황": "My attendance",
  "다음 강의 언제예요?": "When is the next session?",
  "결석하면 어떻게 돼요?": "What if I miss a session?",
  "심화과정 지원": "Advanced course application",
  "참가비가 있나요?": "Is there a fee?",
  "피란수도 부산이 뭐예요?": "What was wartime-capital Busan?",
  "남은 강의를 모두 들어야 수료할 수 있는 참가자": "participants who must attend every remaining session",
  "이미 수료가 어려운 참가자": "participants who can no longer complete",
  "· 참가자 탭에서 '자문위원 인증 대기'를 눌러 확인하세요.": "· Review them under 'Pending verification' in Participants.",
  "온라인 출석이 기록돼요. 운영진이 중계 접속 기록과 대조해요.": "online attendance is recorded. Staff check it against the stream log.",
  "민주평통 부산지역회의 사무처": "NUAC Busan Regional Council Secretariat",
  "민주평화통일자문회의 부산지역회의 사무처": "NUAC Busan Regional Council Secretariat",
  "예비 선발": "Waitlist",
  "독창성": "Originality",
  "실현 가능성": "Feasibility",
  "평화 가치": "Peace value",
  "발표": "Presentation",
  "현장 참여자에게는 식사대용품이 제공되고, 심화과정은 숙식이 지원돼요.": "In-person participants get a meal pack, and the advanced course covers meals and lodging.",
  "공식 안내문에서 답을 찾지 못했어요. 아래 버튼을 누르면 이 질문을 운영진에게 보내 드려요.": "I couldn't find this in the official guide. Tap the button below to send it to staff.",
  "결석한 강의는 다시보기 자료로 복습할 수 있지만 출석으로 인정되지는 않아요. 현장에 못 오는 날은 온라인으로 듣고 앱에서 온라인 출석을 눌러 주세요.": "You can review a missed session with the replay, but it doesn't count as attendance. If you can't come in person, join online and tap Online check-in in the app.",
  "참가비는 없어요. 현장 참여자에게는 식사대용품이 제공되고, 심화과정은 숙식이 지원돼요. 교통비 기준은 사무처 확정 후 공지로 안내해 드려요.": "There's no fee. In-person participants get a meal pack and the advanced course covers meals and lodging. Travel support will be announced once confirmed.",
  "6·25전쟁 중 부산은 1950년 8월부터 1953년 8월까지 약 1,023일 동안 대한민국의 임시수도였어요. 1강 「피란수도 부산이 말하는 평화」에서 다뤄요.": "During the Korean War, Busan was the provisional capital of the Republic of Korea for about 1,023 days, from August 1950 to August 1953. Session 1 covers it.",
  "모든 강의는 온라인으로 동시 중계돼요. 강의 당일 시작 30분 전부터 종료 1시간 뒤까지 출석 탭의 '온라인 출석하기'를 누르면 기록되고, 운영진이 접속 기록과 대조해요.": "Every session is streamed live. From 30 minutes before the start until 1 hour after the end, tap 'Check in online' on the Attendance tab. Staff check it against the stream log.",
  "현장에서는 출석 탭의 내 QR을 입구 운영진에게 보여 주면 바로 기록돼요. 휴대폰이 없으면 수강번호를 말해 주세요.": "In person, show your QR on the Attendance tab to staff at the entrance. Without a phone, tell them your enrollment number.",
  "수료 요건을 채우면 수료식 날 내 정보 탭에 수료증이 발급되고, 인쇄하거나 PDF로 저장할 수 있어요.": "Once you meet the requirement, your certificate appears in My info on the ceremony day. You can print it or save it as PDF.",
  "기본과정 강의는 모두 끝났어요. 심화과정 일정은 일정 탭에서 볼 수 있어요.": "All basic sessions are finished. See the advanced course in Schedule.",
  "재한유엔기념공원은 부산 남구에 있는 유엔군 묘지로, 6·25전쟁에 참전한 유엔군 장병이 잠들어 있어요. 심화과정 1일차 현장교육 장소 중 하나예요.": "The UN Memorial Cemetery in Korea, in Nam-gu, Busan, is where UN soldiers who served in the Korean War rest. It's a field-study site on day 1 of the advanced course.",
  "민주평통 청년운영위원회의 청년아카이브(youtharchive.kr)에서 행사 기록과 활동을 볼 수 있어요. 홈 화면 아래에 바로가기가 있어요.": "See event records and activities at the NUAC Youth Archive (youtharchive.kr). There's a shortcut at the bottom of Home.",
  "내 정보 탭에서 정보 수정, 개인정보 처리 안내, 회원 탈퇴를 할 수 있어요.": "In My info you can edit your details, read the privacy notice and delete your account.",
  "평화학교 도우미는 정치적 중립을 지키기 위해 특정 정당이나 인물에 대한 의견을 답하지 않아요. 강의나 운영 안내를 물어봐 주세요.": "To stay politically neutral, the helper doesn't give opinions on parties or people. Please ask about sessions or logistics.",
  "내 출결 기록": "My attendance record",
  "운영 계획 심화과정": "Plan · advanced course",
  "수료증 발급 안내": "Certificate guide",
  "기본과정 일정": "Basic course schedule",
  "운영 계획 수료 기준": "Plan · completion rule",
  "운영 계획 출결 기준": "Plan · attendance rule",
  "운영 계획 참여 방식": "Plan · participation",
  "현장 출석 안내": "In-person check-in guide",
  "운영 계획 참가 혜택": "Plan · benefits",
  "1강 자료": "Session 1 materials",
  "심화과정 현장교육": "Advanced field study",
  "모집 요강": "Recruitment guide",
  "청년아카이브": "Youth Archive",
  "개인정보 처리 안내": "Privacy notice",
  "도우미 운영 원칙": "Helper principles",
  "운영진 문의": "Ask staff",
  "출처": "Source",
  "해외": "Overseas",
  "체험 모드": "demo mode",
  "실시간 순위": "Live ranking",
  "세종특별자치시": "Sejong",
  "제주특별자치도": "Jeju"
});
const PLACE = { 서울: "Seoul", 부산: "Busan", 대구: "Daegu", 인천: "Incheon", 광주: "Gwangju", 대전: "Daejeon", 울산: "Ulsan", 세종: "Sejong", 경기: "Gyeonggi", 강원: "Gangwon", 충북: "Chungbuk", 충남: "Chungnam", 전북: "Jeonbuk", 전남: "Jeonnam", 경북: "Gyeongbuk", 경남: "Gyeongnam", 제주: "Jeju", 미주: "Americas", 일본: "Japan", 중국: "China", 아세안: "ASEAN", "유럽·중동·아프리카": "Europe, Middle East & Africa", 중남미: "Latin America", 대양주: "Oceania" };
for (const [k, v] of Object.entries(PLACE)) { EN[k] = EN[k] || v; EN[k + "지역회의"] = v + " Regional Council"; }

// 한글 로마자 표기 (협의회 이름처럼 사전에 없는 지명용, 간단한 음절 단위 변환)
const RI = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const RV = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const RF = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","p","l","m","p","p","t","t","ng","t","t","k","t","p","t"];
function romanize(w) {
  let out = "";
  for (const ch of w) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) { out += ch; continue; }
    out += RI[Math.floor(c / 588)] + RV[Math.floor((c % 588) / 28)] + RF[c % 28];
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}
function placeName(name) {
  const m = name.match(/^(.+?)(구|시|군)$/);
  if (m && m[1].length >= 1 && /^[가-힣]+$/.test(m[1])) return romanize(m[1]) + "-" + { 구: "gu", 시: "si", 군: "gun" }[m[2]];
  return /^[가-힣]+$/.test(name) ? romanize(name) : null;
}
RULES.push(
  [/^([가-힣]+)협의회$/, (m, n) => (placeName(n) || n) + " Council"],
  [/^(\d+)일차 (.+)$/, (m, n, d) => "Day " + n + " " + tr(d)],
  [/^(\d+)팀$/, "Team $1"],
  [/^(\d+)강 · (.+)$/, (m, n, d) => "Session " + n + " · " + tr(d)],
  [/^지금까지 (\d+)강 출석했어요(?: \(([\d, ]+)강\))?\. (.+)$/, (m, n, l, rest) => `You've attended ${n} session(s)${l ? ` (${l})` : ""}. ${tr(rest)}`],
  [/^수료 요건을 채웠어요!$/, "You've met the completion requirement!"],
  [/^다음 강의는 (\d+)강 「(.+)」, (.+) (\d+:\d+)~(\d+:\d+)이에요\. 장소: (.+)\.$/, (m, n, t, d, a, b, v) => `The next session is ${n}, “${tr(t)}”, ${tr(d)} ${a}–${b}. Venue: ${tr(v)}.`],
  [/^기본과정 (\d+)강 중 (\d+)강 이상 출석하면 수료예요\..*$/, "Attend $2 of the $1 basic sessions to complete. In-person and online both count, completion lets you apply for the advanced course, and the certificate is issued in the app on the ceremony day."],
  [/^대상은 만 19세~39세 청년이에요 \((\d+)~(\d+)년생\)\..*$/, "The course is for ages 19–39 (born $1–$2), from anywhere in Korea."],
  [/^심화과정 · 부산 2박3일은 (.+)에 열려요\. 정원 (\d+)명\((\d+)팀\)이고, (\d+)강 이상 출석한 수료 예정자가 지원할 수 있어요\.(.*)$/, (m, d, cap, t, pc, rest) => `The advanced course runs ${tr(d)}, with ${cap} seats (${t} teams). Anyone who has attended ${pc}+ sessions can apply.` + (/지원 마감은 (.+)\(한국 시간\)이에요/.test(rest) ? ` Deadline: ${rest.match(/지원 마감은 (.+)\(한국 시간\)이에요/)[1]} (KST).` : "")],
  [/^(.+) (\d+:\d+)~(\d+:\d+) · (.+)$/, (m, d, a, b, x) => `${tr(d)} ${a}–${b} · ${tr(x)}`],
  [/^(\d+)명 · (\d+)%$/, "$1 · $2%"],
  [/^(\d+) \/ (\d+)명$/, "$1 / $2"],
  [/^\/ (\d+)명 현장$/, "/ $1 in person"],
  [/^온라인 (\d+)명 별도$/, "+ $1 online"],
  [/^(.+) \((\d+)\)$/, (m, a, n) => { const t = tr(a); return t === a ? m : `${t} (${n})`; }]
);

// 가입 단계의 동의 표 (동의하는 내용은 영어로도 읽을 수 있어야 한다)
Object.assign(EN, {
  "자문위원은 운영진이 명단과 대조해 인증한 뒤 '인증됨'으로 표시돼요. 그전까지는 '인증 대기'예요.": "Advisory members show as 'Verified' after staff check the member list. Until then they show 'Pending verification'.",
  "두 방식 모두 출석으로 인정돼요.": "Both count as attendance.",
  "수집·이용 목적": "Purpose",
  "목적": "Purpose",
  "수집 항목": "Data collected",
  "항목": "Data",
  "보유·이용 기간": "Retention",
  "동의 거부 권리": "Right to refuse",
  "[선택] 개인정보 수집·이용 동의": "[Optional] Consent to collection and use of personal data",
  "평화학교 수강 신청 접수·본인 확인, 출결 관리, 수료 판정과 수료증 발급, 심화과정 지원·선발, 운영 공지와 문의 응대": "Receiving applications and verifying identity, attendance, completion and certificates, advanced course applications and selection, notices and inquiries",
  "이름, 이메일, 출생연도, 거주 지역(시·도), 민주평통 소속(지역회의·협의회)과 참가 구분, 자문위원인 경우 위촉 기수·위촉 번호(번호는 선택), 참여 방식, 출결 기록, 앱에 남긴 문의 및 운영진 답변, 심화과정 지원서(지원자에 한함)": "Name, email, birth year, region, NUAC council and participant type, advisory term and appointment no. for advisory members (number optional), participation mode, attendance, in-app inquiries and staff replies, advanced course application (applicants only)",
  "회원 탈퇴 시 또는 과정 종료 후 1년이 지나면 지체 없이 파기": "Deleted without delay when you leave or one year after the course ends",
  "동의하지 않을 수 있으며, 이 경우 수강 신청과 출결·수료 관리가 불가능합니다.": "You may refuse, but then we can't process your application, attendance or completion.",
  "긴급 일정 변경 시 개별 연락, 소속별 참가 현황 통계": "Contacting you about urgent schedule changes, participation statistics by affiliation",
  "휴대폰 번호, 소속(학교·직장)": "Mobile number, school or workplace",
  "회원 탈퇴, 동의 철회 시 또는 과정 종료 후 1년이 지나면 지체 없이 파기": "Deleted without delay when you leave, withdraw consent, or one year after the course ends",
  "동의하지 않아도 수강 신청과 모든 기능을 이용할 수 있습니다.": "You can apply and use every feature without agreeing.",
  "행사 기록, 결과보고서, 민주평통 누리집·SNS·청년아카이브 게시": "Event records, results reports, posts on the NUAC website, social media and Youth Archive",
  "행사 중 촬영된 얼굴이 식별되는 사진·영상": "Photos and videos taken at events in which faces can be identified",
  "게시물 존속 기간 (철회 시 새 게시 중단, 게시물은 요청 시 지체 없이 삭제·비식별 처리)": "While posts remain (withdrawing stops new posts; existing posts are deleted or de-identified on request)",
  "동의하지 않아도 참여에 아무런 불이익이 없으며, 촬영 시 얼굴이 나오지 않도록 배려합니다.": "Refusing has no effect on your participation, and we'll take care that your face isn't shown.",
  "선택 항목은 동의하지 않아도 신청과 모든 기능을 이용할 수 있어요. 국외 이전(로그인 인증 서버, 미국) 등 자세한 내용은": "You can apply and use every feature without the optional items. For details such as transfer abroad (sign-in server in the US), see the"
});
RULES.push(
  [/^전국 어디서나 참여할 수 있어요\. 현장 정원은 (\d+)명이에요\.$/, "Join from anywhere in Korea. In-person capacity is $1."],
  [/^근거: (.+)$/, (m, a) => "Source: " + tr(a)],
  [/^자문위원 (제\d+기) \(가입 후 운영진 인증\)$/, (m, t) => `Advisory member, ${tr(t)} (verified by staff after sign-up)`]
);

const norm = s => s.replace(/\s+/g, " ").trim();

function lookup(k) {
  if (!/[가-힣]/.test(k)) return k;
  if (EN[k] !== undefined) return EN[k];
  for (const [re, rep] of RULES) { if (re.test(k)) { const o = k.replace(re, rep); if (o !== k) return o; } }
  return undefined;
}
// 조각 문장: " · "로 나눈 조각마다 번역하고, 남은 숫자 단위만 바꾼다
const UNITS = [[/(\d+)명/g, "$1"], [/(\d+)건/g, "$1"], [/(\d+)강/g, "S$1"]];
const CACHE = new Map();
export function tr(text) {
  if (!text || !/[가-힣]/.test(text)) return text;
  const hit = CACHE.get(text);
  if (hit !== undefined) return hit;
  const res = trRaw(text);
  if (CACHE.size > 5000) CACHE.clear();
  CACHE.set(text, res);
  return res;
}
function trRaw(text) {
  const k = norm(text);
  let out = lookup(k);
  if (out === undefined && k.includes(" · ")) {
    const parts = k.split(" · ").map(x => { const t = lookup(x); return t === undefined ? x : t; });
    const joined = parts.join(" · ");
    if (joined !== k) out = joined;
  }
  if (out === undefined) {
    let t = k;
    for (const [re, rep] of UNITS) t = t.replace(re, rep);
    if (t !== k && !/[가-힣]/.test(t)) out = t;
  }
  if (out === undefined) {
    // 단독 조각: "명", "명 (현장 19 · 온라인 0)" 처럼 굵은 숫자 옆 글자
    const frag = { "명": "", "건": "", "명,": ",", "강": "" };
    if (frag[k] !== undefined) out = frag[k];
    else if (/^명 \(현장 (\d+) · 온라인 (\d+)\)$/.test(k)) out = k.replace(/^명 \(현장 (\d+) · 온라인 (\d+)\)$/, " ($1 in person · $2 online)");
    else if (/^명, (.+)$/.test(k)) { const t = lookup(k.slice(3)); if (t !== undefined) out = ", " + t; }
    else if (/^명 (.+)$/.test(k)) { const t = lookup(k.slice(2)); if (t !== undefined) out = " " + t; }
  }
  if (out === undefined) {
    // 날짜의 요일만 바꾸기: 2027. 4. 24.(토) → 2027. 4. 24.(Sat)
    if (/\(([일월화수목금토])\)/.test(k) && /\d/.test(k)) out = k.replace(/\(([일월화수목금토])\)/g, (m, d) => `(${WEEK[d]})`);
  }
  if (out === undefined) return text;
  if (/\(([일월화수목금토])\)/.test(out)) out = out.replace(/\(([일월화수목금토])\)/g, (m, d) => `(${WEEK[d]})`);
  const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
  return lead + out + tail;
}

// 영어로 물어본 질문을 도우미가 알아듣는 한국어 낱말로 바꾼다
const ASK = [[/attend|check.?in|absence|my record/i, "내출석"], [/advanced|hackathon|august|selection/i, "심화"], [/certificate|pdf|print/i, "수료증"], [/next|when|schedule|date|time/i, "다음강의"], [/complet|requirement|pass/i, "수료조건"], [/miss|absent|replay/i, "결석"], [/online|stream|zoom/i, "온라인"], [/qr|scan/i, "qr"], [/fee|cost|free|price|travel|lodging|meal/i, "참가비"], [/wartime|capital|refugee/i, "피란"], [/un memorial|cemetery/i, "유엔"], [/age|eligib|who can/i, "대상"], [/archive/i, "아카이브"], [/privacy|delete|account/i, "개인정보"], [/party|election|president|candidate/i, "정당"]];
export function toHelperQuery(q) {
  if (currentLang() !== "en" || /[가-힣]/.test(q)) return q;
  const hit = ASK.find(([re]) => re.test(q));
  return hit ? hit[1] : q;
}

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
const ATTRS = ["placeholder", "aria-label", "title"];

function translateNode(root) {
  if (root.nodeType === 3) {
    const p = root.parentElement;
    if (p && !SKIP.has(p.tagName) && !p.closest("[data-noi18n]")) {
      // 34px 원형 칸 안의 "1강"은 숫자만 남긴다 (영문 "Session 1"은 칸을 넘친다)
      const t = p.classList && p.classList.contains("dot") && /^\s*\d+강\s*$/.test(root.nodeValue) ? root.nodeValue.replace("강", "") : tr(root.nodeValue);
      if (t !== root.nodeValue) {
        // value가 없는 option은 글자가 곧 값이므로, 바꾸기 전에 원래 값을 고정한다
        if (p.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", p.textContent);
        root.nodeValue = t;
      }
    }
    return;
  }
  if (root.nodeType !== 1 || root.closest?.("[data-noi18n]")) return;
  for (const a of ATTRS) if (root.hasAttribute?.(a)) { const v = root.getAttribute(a), t = tr(v); if (t !== v) root.setAttribute(a, t); }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 1) {
      if (n.hasAttribute("data-noi18n") || n.closest("[data-noi18n]")) continue;
      for (const a of ATTRS) if (n.hasAttribute(a)) { const v = n.getAttribute(a), t = tr(v); if (t !== v) n.setAttribute(a, t); }
    } else translateNode(n);
  }
}

let observer = null;
export function initI18n() {
  const lang = currentLang();
  document.documentElement.lang = lang;
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-lang-set]");
    if (!b) return;
    const v = b.getAttribute("data-lang-set");
    if (v === currentLang()) return;
    store.set(v);
    // 주소의 ?lang= 이 저장값을 다시 덮지 않도록 지운 뒤 새로 연다
    try { const u = new URL(location.href); if (u.searchParams.has("lang")) { u.searchParams.delete("lang"); history.replaceState(null, "", u.toString()); } } catch (err) {}
    location.reload();
  });
  if (lang !== "en") return;
  translateNode(document.body);
  document.title = tr(document.title);
  observer = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === "characterData") translateNode(m.target);
      else if (m.type === "attributes") {
        const el = m.target, a = m.attributeName, v = el.getAttribute(a);
        if (v && !el.closest("[data-noi18n]")) { const t = tr(v); if (t !== v) el.setAttribute(a, t); }
      }
      else m.addedNodes.forEach(translateNode);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// 언어 선택 버튼 (설정 화면·로그인 화면)
export function langChips() {
  const cur = currentLang();
  return `<div class="chips" data-noi18n>${[["ko", "한국어"], ["en", "English"]].map(([k, l]) => `<button type="button" class="chip" data-lang-set="${k}" aria-pressed="${cur === k}">${l}</button>`).join("")}</div>`;
}
