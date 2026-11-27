# 한반도 평화학교 Android 내부 테스트 후보

앱 식별자는 `kr.busan.peaceschool`, 후보 표시 버전은 `1.3.2`다. Android와 iOS 내부 시험판은 같은 커밋의 `www/`를 사용한다. Android 대상 SDK는 36이고 최소 SDK는 24(Android 7.0)다. Play Console의 자동 보호를 적용한 내부 테스트 번들의 요구사항을 반영했다. 로그인 화면의 국문 시그니처는 제공된 민주평화통일자문회의 원본이며, 앱 아이콘과 화면의 심벌은 기존 2색 공식 자산을 쓴다.

## 후보 패키지와 설치 시험

1. GitHub 저장소 변수 `PSB_STAGING_PROJECT_ID`와 `PSB_STAGING_FIREBASE_CONFIG`에 별도 시험 프로젝트 ID와 해당 Firebase 웹 앱 설정을 지정한다. `codex/android-play-test` 브랜치에서 Android 워크플로를 실행한다. `peace-school-debug-apk`는 Android 설치 시험용이고 `peace-school-unsigned-aab`는 서명 전 번들이다. 에뮬레이터 실행 결과는 해당 잡의 시작 검사와 테스트 XML에서 확인한다.
2. Android 검증이 통과하면 같은 GitHub Actions 실행에서 같은 커밋으로 Apple 빌드를 이어서 만든다. Android AAB와 Apple 패키지를 각각 공통 `www/` 및 시험 Firebase 설정과 대조한다. Apple 작업 요약에 커밋과 실행 번호가 기록된다. 로컬 패키지를 대조할 때는 시험 설정으로 `www/`를 생성한 후 `python3 scripts/verify_web_assets.py <경로> staging`을 사용한다.
3. 실제 기기에서는 별도 시험 Firebase로 신청과 출결 동기화, 로그인, QR 권한 허용·거절·재요청, 수강번호 입력, 재시작, 탈퇴를 확인한다. 가상 정보만 사용하고 기기·OS·앱 빌드·커밋을 기록한다.

## 휴대폰·태블릿·Mac 화면 확인

- iPhone과 iPad는 같은 iOS 빌드를 설치한다. iPad 세로·가로와 좁은 창에서 문의 작성과 답변 목록, 운영진의 QR·수강번호 입력·최근 출석을 확인한다.
- Android 휴대폰과 태블릿은 같은 AAB를 사용한다. 태블릿 세로·가로에서 카메라가 한 화면만 보이는지 확인한다.
- Apple Silicon Mac에서 iPad 앱으로 테스트할 때는 TestFlight 그룹의 Mac 테스트 조건을 확인한다. Mac 카메라 접근과 수강번호 대체 입력은 별도로 시험한다. Intel Mac에서는 웹을 사용할 수 있다. [Apple Silicon Mac 앱 가용성](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon/)

## 1.3.2 검증 기록

2026년 11월 27일 기준 후보 커밋은 `a9fe4553dcf6eb2774652bbb1e93d2358de93dda`다. Android 빌드 43과 Apple 빌드 15에서 `www/` 공통 파일 25개와 시험 Firebase 설정을 대조했다. [공통 빌드 및 자동 검증](https://github.com/KDYPOHO/peace-school-busan/actions/runs/45950312166)

| 환경 | 후보 빌드 | 확인한 범위 |
|---|---|---|
| Android 7.0·16 에뮬레이터 | 43 | 앱 시작, 가상 문의·답변과 출석 화면 회귀 검사 통과 |
| iPhone·iPad 시뮬레이터 | 15 | 양쪽 앱 설치와 시작 통과 |
| Apple Silicon Mac (`Mac15,3`, macOS 27.2.1) | 15, Xcode 개발 서명 | 시험 Firebase 로그인, 온라인 출석 저장, 문의 발송, 알림에서 운영진 답변 열기, 읽음 기록 재조회 통과 |
| Pixel 5 실기기 (Android 11·API 30) | 43, 시험 APK | Test Lab 기본 실행과 자동 탐색 통과. 가상 계정의 로그인·출석·문의 흐름은 미검증. [Pixel 5 결과](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/6865330913274194458) |
| Galaxy Tab S8 실기기 (Android 14·API 34) | 43, 시험 APK | 한국어·가로 방향에서 Test Lab 기본 실행과 자동 탐색 통과. 가상 계정 자동 로그인은 확인되지 않음. [Galaxy Tab S8 결과](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/7550342388503393454) |
| iPhone SE 3 실기기 (iOS 26.3) | 15, 시험 IPA | 한국어·세로 방향 Test Lab 검사 접수. [iPhone SE 3 진행 상태](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/8467789990125918884) |

iPhone 실기기 결과 확인과 iPad 실기기 검증이 남아 있다. 11월 27일 Test Lab iOS 카탈로그에서는 실행 가능한 iPad가 조회되지 않았다. 같은 계정으로 플랫폼을 바꿔 수행하는 실기기 시나리오와 Play Console·TestFlight 내부 채널 설치도 확인이 필요하다. Android AAB는 업로드 서명 전 상태다.

## 업로드 서명

Play Console에서 패키지와 사용 중인 업로드 인증서를 확인한다. 호환되는 업로드 키를 로컬 비밀 저장소에서 관리하고 다음 환경 변수를 로컬 프로세스에 주입한다.

- `ANDROID_UPLOAD_KEYSTORE`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`
- `ANDROID_VERSION_CODE`는 해당 앱에 올린 버전 코드보다 높은 정수

`npm ci`, `npx cap sync android` 후 `android` 디렉터리에서 `./gradlew bundleRelease`를 실행한다. `app/build/outputs/bundle/release/app-release.aab`의 서명과 인증서를 `jarsigner -verify`와 `keytool -printcert -jarfile`로 확인한다. 실제 제출은 해당 앱의 **내부 테스트** 트랙에서 진행한다. [대상 SDK 정책](https://support.google.com/googleplay/android-developer/answer/11926878) · [Play 앱 서명](https://support.google.com/googleplay/android-developer/answer/9842756) · [테스트 트랙](https://support.google.com/googleplay/android-developer/answer/9845334)

## 법령 및 스토어 검증

- 개인정보 수집·이용 고지는 「개인정보 보호법」 제15조·제16조·제22조, 파기와 권리 행사 안내는 제21조·제35조~제38조 및 실제 데이터 경로와 대조한다. 실제 운영 개시 전에 개인정보처리자와 문의 창구, 위탁·국외 이전, 보유 기간 및 운영자가 내려받은 명단의 파기 절차를 확인한다. [국가법령정보센터 개인정보 보호법](https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260911&lsiSeq=283839)
- Play Console의 계정 삭제 URL에는 배포 후 `https://kdypoho.github.io/peace-school-busan/?account=delete`를 입력하기 전에 인터넷 브라우저에서 로그인 → 재인증 → 참가 기록 삭제 결과를 확인한다. 이 URL과 앱 안 탈퇴 화면이 같은 삭제 경로를 사용한다. [Google Play 사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311) · [Apple 계정 삭제 지침](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/)
