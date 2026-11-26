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

## 폴더

```
www/                 웹 앱 (이 폴더가 그대로 웹·안드로이드·아이폰 앱이 됨)
  js/config.js       강의 날짜, 정원, Firebase 설정 등 ← 운영 정보는 여기만 고치면 됨
  js/app.js          화면과 동작
  js/backend.js      Firebase / 체험 모드 데이터 처리
  js/faq.js          도우미 답변집
  js/councils.js     민주평통 지역회의·협의회 목록 (국내 17 + 해외)
firestore.rules      데이터 보안 규칙 (Firebase 콘솔에 게시된 내용과 같음)
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

강의 날짜·제목, 정원, 심화과정 일정, 지원 마감은 `www/js/config.js` 에 있습니다. 고쳐서 `main`에 올리면 웹은 몇 분 안에 자동 반영되고, 안드로이드 APK도 자동으로 다시 빌드됩니다.

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
