# 부산 청년 평화학교 앱

민주평화통일자문회의 부산지역회의 「2027 부산 청년 평화학교」 공식 앱입니다.
하나의 코드로 **웹(누구나 주소로 접속)**, **안드로이드**, **아이폰** 앱을 만듭니다.

- 웹 주소: https://kdypoho.github.io/peace-school-busan/
- 데이터: Firebase (프로젝트 `kdypoho`, 서울 리전, 무료 Spark 요금제)
- AI 도우미: 외부 AI를 부르지 않는 공식 안내문 기반 답변 (AI 비용 0원)

## 기능

| 참가자 | 운영진 |
|---|---|
| 이메일·Google 로그인, 3단계 수강 신청 | 현황판 (신청·출석률·수료 요건 충족·심화 지원) |
| 개인 QR 수강증, 온라인 출석 (강의 당일만) | 휴대폰 카메라 QR 스캔 출석, 수강번호 직접 입력 |
| 수료 요건 자동 계산 (5강 중 4강) | 수료 위험·수료 불가 참가자 자동 계산 |
| 공지함, 도우미, 운영진 문의 | 공지 올리기(템플릿), 문의함 답변 |
| 심화과정 지원서 (정원 40명) | 심화 선발 (정원 초과 선발 차단, 예비) |
| 수료증 (수료식 날 자동 발급, 인쇄·PDF) | 해커톤 심사 실시간 집계 |
| 큰 글씨, 밝게/어둡게, 회원 탈퇴 | 참가자 수동 출결, CSV 명단, 결과보고서 초안 |

## 7개 부서 검수 체계

계획안·누리집·앱·홍보물을 총괄 지침(`CLAUDE.md`) 기준으로 7개 부서(개발, 디자인, 홍보, 소셜·기록, 재무, 대외협력·운영, 법무·감사)가 차례로 검수합니다. Claude Code에서 `/dept-review <대상>`, 새 산출물은 `/dept-produce <산출물>`, 무료 자동 점검은 `python3 scripts/dept_check.py`. 자세한 내용은 [docs/departments/README.md](docs/departments/README.md).

## 폴더

```
www/                 웹 앱 (이 폴더가 그대로 웹·안드로이드·아이폰 앱이 됨)
  js/config.js       기수·강의·정원 및 시험 기준
  js/app.js          화면과 동작
  js/backend.js      Firebase / 체험 모드 데이터 처리
  js/faq.js          도우미 답변집
  js/councils.js     민주평통 지역회의·협의회 목록 (국내 17 + 해외)
firestore.rules      배포 후보 데이터 보안 규칙
android/  ios/       Capacitor로 만든 네이티브 앱 프로젝트
.github/workflows/   웹 자동 배포, 안드로이드 APK 자동 빌드
```

## 처음 한 번: 운영진 등록

보안 규칙상 운영진은 운영진만 추가할 수 있어서, **첫 운영진 한 명은 Firebase 콘솔에서 직접** 넣습니다.

1. 앱에 가입하고 **내 정보 > 앱 정보 > 계정 ID**를 복사합니다.
2. [Firebase 콘솔 > Firestore](https://console.firebase.google.com/project/kdypoho/firestore) 에서 컬렉션 `staff` 를 만들고,
   문서 ID에 복사한 계정 ID를 넣고 필드 `label`(문자열, 예: 사무처)을 추가해 저장합니다.
3. 앱을 다시 열면 위쪽에 **참가자 / 운영진** 전환 버튼이 생깁니다. 이후 운영진은 앱 안에서 추가합니다.

## 운영 정보 바꾸기

강의 날짜·제목과 정원은 `www/js/config.js`에서 관리합니다. Firestore의 `courseSchedule/1`~`5` 문서에는 온라인 출석에 쓰는 `opensAt`·`closesAt` 타임스탬프를 저장합니다. 심화 지원 화면과 서버 판단은 `courseSchedule/deep.closesAt`의 마감 시각을 사용합니다. 운영 문서는 확정 일정을 기준으로 작성합니다.

### 1.3.2 Firebase 연결 및 검증

- 운영 대상은 기존 **Busan Peace School** 프로젝트 `kdypoho`입니다. `PSB_BUILD_MODE=production npm run build:web`는 기존의 공개 웹 SDK 설정을 사용합니다.
- 시험 빌드는 `PSB_BUILD_MODE=staging`과 두 변수 `PSB_STAGING_PROJECT_ID`, `PSB_STAGING_FIREBASE_CONFIG`의 일치하는 별도 프로젝트 설정이 필요합니다. `kdypoho`를 시험 대상으로 지정하면 빌드가 실패합니다.
- 로컬 개발은 `npm ci`, `PSB_BUILD_MODE=development npm run build:web` 순서로 실행합니다. 에뮬레이터는 `npx firebase emulators:start --project demo-hanbando-school --only auth,firestore`, 시험 일정은 `node scripts/staging-schedule.mjs --emulator`로 준비합니다. 웹에서 `?emulator=localhost`로 열거나 데이터가 기기에만 저장되는 체험은 `?demo=1`로 선택합니다.
- 두 플랫폼 패키지는 같은 빌드 모드에서 생성된 `www/`를 사용합니다. 준비한 Firebase 모드는 배포 전 `python3 scripts/verify_web_assets.py <패키지 또는 public 폴더> <모드>`로 검증합니다. 자동 검증은 `npm test`와 `npm run test:firebase`를 실행합니다.
- 운영 규칙 적용 전 활성 규칙을 보관하고 `notices`에 심화 공지가 있는지 확인합니다. 이 경로는 이전 앱도 읽는 전체 공지용입니다. 심화 공지는 선발자와 운영진만 읽을 수 있는 `deepNotices`를 사용합니다. 기존 심화 공지가 있으면 원문을 보존해 새 경로로 옮긴 뒤 전체 공지 경로에서 제거합니다. 좌석 기록 없는 기존 심화 선발 상태의 호환성도 확인합니다. 기존 선발자는 기록을 보존하며 좌석을 배정합니다. 정원 또는 데이터 불일치가 있으면 운영진 확인을 먼저 받습니다. 시험 마감 6월 20일은 시험 일정에만 사용합니다.

## 휴대폰에서 시험하기

안드로이드 APK 바로 받기, 아이폰 설치(Xcode·TestFlight) 방법은 [docs/TESTING.md](docs/TESTING.md)에 있습니다.

## 안드로이드

- `main`에 올릴 때마다 GitHub Actions가 **시험용 APK**를 만듭니다: 저장소 > Actions > 「안드로이드 앱 빌드」 > 최신 실행 > Artifacts.
- Play 스토어 출시용(AAB, 서명)은 Android Studio에서 `npx cap open android` → Build > Generate Signed Bundle.
  서명 키(.jks)는 저장소에 올리지 말고 따로 안전하게 보관하세요.

## 아이폰 (Mac 필요)

```bash
npm ci
npx cap sync ios
npx cap open ios      # Xcode가 열림
```
Xcode에서 App 타깃 > Signing & Capabilities > Team에 Apple 개발자 계정을 고르고, 번들 ID `kr.busan.peaceschool` 로 실행합니다. App Store 제출은 Product > Archive.

> 앱 안에서는 Google 로그인 팝업이 막히므로 **이메일 로그인**만 보입니다. 웹에서는 둘 다 됩니다.

## 비용

Firebase 무료 한도(하루 읽기 5만, 쓰기 2만 건)는 참가자 수백 명 규모에 충분합니다. 휴대폰 푸시 알림은 유료 요금제(Blaze)와 서버 함수가 필요해 2단계로 미뤘고, 지금은 앱 안 공지로 안내합니다.
