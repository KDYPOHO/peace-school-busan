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
| Pixel 5 실기기 (Android 11·API 30) | 45, 시험 APK | Mac과 같은 가상 계정으로 로그인했다. QR 수강증, 수강번호 복사 버튼, 1강 출석과 기존 운영진 답변을 확인했다. Android에서 보낸 문의가 시험 Firebase에 1건 저장됐다. [실기기 계정 검사](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/6517047939321578200) |
| Galaxy Tab S8 실기기 (Android 14·API 34) | 43, 시험 APK | 한국어·가로 방향에서 Test Lab 기본 실행과 자동 탐색 통과. 가상 계정 자동 로그인은 확인되지 않음. [Galaxy Tab S8 결과](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/7550342388503393454) |
| Galaxy Tab S8 실기기 (Android 14·API 34) | 45, 시험 APK | 가상 계정으로 로그인해 QR 수강증, 1강 출석과 Apple Silicon Mac에서 저장한 운영진 답변을 확인했다. 태블릿에서 보낸 새 문의가 1건 저장됐다. [교차 기기 답변 결과](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/5474074139023308158) |
| 사용자 갤럭시 (Android 16) | 45, 시험 APK | USB 설치에 성공했다. 앱이 처음 열리고 실행 상태를 유지했다. |
| iPhone SE 3 실기기 (iOS 26.3) | 15, 시험 IPA | 한국어·세로 방향에서 Test Lab 앱 시작과 자동 탐색을 통과했다. 참가자·운영진 계정 흐름은 별도로 확인한다. [iPhone SE 3 결과](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/8467789990125918884) |
| 사용자 iPhone | 빌드 미확인 | 11월 27일 사용자 직접 사용에서 정상 동작을 확인했다. |
| iPad Pro 12.9형 3세대 실기기 (iPadOS 26.7.3) | 기존 1.3.1(11), 시험 1.3.2(15) | 기존 앱과 개발 서명 시험판 `kr.busan.peaceschool.qa`가 함께 설치됐으며 양쪽 실행에 성공했다. 사용자가 시험판을 직접 열었고 `xcrun devicectl`에서도 실행 성공을 확인했다. 시험판 공통 파일 25개가 Android 빌드 45와 일치했다. |

Android 빌드 45는 `6f439be2c7a3a314e614a5c569d364e51682c35b`에서 만든 시험 APK다. Android 빌드 45와 Mac에서 실행한 Apple 빌드 15의 공통 웹 파일 25개 해시가 일치했다. GitHub에서 같은 커밋으로 두 패키지의 공통 자산과 시험 프로젝트 설정을 대조했고 Android API 24·36, iPhone·iPad 시뮬레이터 검사를 통과했다. [공통 빌드 및 자동 검증](https://github.com/KDYPOHO/peace-school-busan/actions/runs/45956666098)

Pixel 5에서 보낸 문의를 Apple Silicon Mac의 운영진 화면에서 열어 답변했다. 같은 시험 계정으로 Galaxy Tab S8에서 해당 답변을 다시 확인했다.

iPad 시험판의 참가자·운영진 계정 흐름과 Play Console·TestFlight 내부 채널 설치 확인이 남아 있다.

## 신규 가입 승인

새 계정이 수강 신청서를 제출하면 가입 승인 대기로 표시된다. 운영진은 **참가자 → 가입 승인 대기**에서 신청을 확인하고 승인한다. 승인 시각과 처리 계정을 기록하며, 승인 완료 후 참가자 화면이 열린다. 승인 전에는 공지·출결·문의·심화과정에 접근할 수 없다.

이전 버전에서 이미 수강 신청을 마친 계정에는 재승인을 요구하지 않는다. 신규 가입 테스트는 가입 승인 화면이 들어 있는 버전과 최신 Firestore 규칙이 적용된 시험 환경에서 진행한다.

승인 기능 커밋은 `01070f7518e9f831a2e1cfe38f9ac68be6ca68f5`다. 시험 Firebase에 이 커밋의 Firestore 규칙을 적용했다. 시험 계정으로 승인 전 접근·직접 승인·중복 승인 차단과 운영진 승인 후 접근을 확인했다. Chromium과 WebKit에서도 양쪽 대기 화면이 운영진 승인 한 번으로 전환됐다. [후보 빌드와 검증](https://github.com/KDYPOHO/peace-school-busan/actions/runs/45960878587)

Android 46과 iPad 시험판 16의 공통 웹 파일 25개를 대조했다. iPad에 시험판 16을 설치했다. 대기 화면과 승인 후 과정 화면을 확인하는 iPad XCTest를 빌드했으며, 기기 잠금 때문에 실행을 보류했다. 양쪽 내부 채널 배포는 진행 전이다.

iPad(A16) 시뮬레이터(iPadOS 26.5)에서 Apple 시험 빌드 16으로 가입 승인 XCTest 1건을 통과했다. 승인 대기 중에는 과정 메뉴를 열 수 없었고, 시험 운영진이 승인하자 같은 로그인 상태에서 출석 메뉴와 수강번호 복사 버튼이 표시됐다. 시험 Firebase에서 승인 시각과 운영진 기록을 확인했다. 시뮬레이터 앱과 서명된 시험 IPA의 공통 파일 27개가 일치했다.

같은 iPad 시뮬레이터에서 이메일 신규 가입과 3단계 수강 신청을 앱을 통해 별도로 완료했다. 새 계정은 과정 메뉴 없이 신청서로 이동했고, 제출 직후 가입 승인 대기 화면에 들어갔다. 시험 Firestore에 새 기록이 대기 상태로 저장됐고, 이 계정으로 일정과 공지를 읽는 두 요청은 권한 오류(403)로 차단됐다. 검사에는 시험 IPA와 공통 파일 27개가 일치하는 임시 시험 앱을 사용했다.

Pixel 5 실기기(Android 11)는 Android 시험 빌드 47에서 가입 승인 실기기 검사를 통과했다. 승인 전에는 대기 화면과 과정 메뉴 차단을 확인했고, 시험 운영진 승인 후 같은 로그인 상태에서 출석 메뉴와 QR 수강증이 열렸다. Android 46·47의 웹 파일과 Capacitor 래퍼 27개 해시는 모두 일치했다. [실기기 승인 결과](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/6080358177710308262) · [Android 테스트 빌드](https://github.com/KDYPOHO/peace-school-busan/actions/runs/45969037294)

Galaxy Tab S8 실기기(Android 14·가로 화면)에서도 같은 Android 시험 빌드 47로 가입 승인 검사를 통과했다. 승인 대기 중에는 과정 메뉴가 차단됐다. 시험 운영진이 승인하자 같은 로그인 상태에서 출석 메뉴와 QR 수강증, 수강번호 복사 버튼이 표시됐다. 첫 실행에서는 로그인 시각이 갱신되지 않아 시험 도구가 승인을 실행하지 못했다. 두 번째 실행에서 실제 승인 기록과 테스트 XML 1건 통과를 대조했다. [Galaxy Tab S8 가입 승인 검사](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/7781770770058600757)

iPhone SE 3 실기기(iOS 26.3)는 Apple 시험 빌드 16의 가입 승인 검사를 통과했다. 승인 대기 계정에서 과정 메뉴가 차단됐고 Android에서 승인한 같은 시험 계정으로 로그인하자 출석 메뉴와 QR 수강증이 표시됐다. 시험 Firebase에서 두 계정의 기기 검사 중 로그인과 승인 상태를 대조했다. [iPhone SE 3 가입 승인 검사](https://console.firebase.google.com/project/hanbando-peace-school-qa/testlab/histories/bh.4c2fdb24b53056aa/matrices/5434270454064507452)

Apple Silicon Mac(`Mac15,3`, macOS 27.2.1)에서 Apple 시험 빌드 16을 Xcode의 iPad 호환 모드로 실행했다. Mac에서 직접 실행된 앱의 WebView로 승인 대기 화면과 과정 차단을 확인했다. 시험 운영진의 승인 시각부터 약 69초 뒤 같은 로그인 상태에서 출석 메뉴와 QR 수강증, 수강번호 복사 버튼이 표시됐다. Xcode가 이 실행 모드의 UI 테스트를 지원하지 않아 임시 시험 코드로 WebView를 검사했다. 실제 실행 앱의 공통 파일 27개는 Apple 시험 IPA와 일치했다.

### 운영 Firebase 전환 확인

2026년 11월 27일 Busan Peace School(`kdypoho`)에 적용 중인 Firestore 규칙은 소스 커밋 `4d7037b58bbf0323aa090a8b815971c1ceb909e9`의 규칙과 일치했다. 해당 규칙으로 개발 에뮬레이터에 기존 참가자·문의·출석·공지 시험 데이터를 만든 뒤 가입 승인 규칙으로 교체했다. 기존 참가자가 네 가지 기록을 계속 읽을 수 있었고, 예전 앱 방식의 신규 가입은 거절됐다. 새 방식으로 신청한 참가자는 운영진이 승인한 뒤 공지를 열 수 있었다.

운영 프로젝트에는 기본 1~5강 일정이 있고 선발 상태인 심화 지원은 0건이었다. 심화 마감일은 공식 일정을 확정한 뒤 반영한다. 운영 규칙은 현행 상태다. 전환 시 양쪽 내부 빌드의 검증과 규칙 적용 일정을 함께 확인한다. [현행 규칙 소스](https://github.com/KDYPOHO/peace-school-busan/blob/4d7037b58bbf0323aa090a8b815971c1ceb909e9/firestore.rules)

운영과 시험 Firebase에서 이메일·비밀번호 가입이 활성화돼 있다. 운영 Firestore에는 기존 규칙이, 시험 Firestore에는 가입 승인 규칙이 적용된 상태를 각각 확인했다.

## 가입 승인 후보 서명 결과

1.3.2 Android 46은 Play Console에 등록된 기존 업로드 인증서로 서명했다. `jarsigner`와 `bundletool validate` 검사를 통과했으며 패키지 `kr.busan.peaceschool`, 최소 API 24, 대상 API 36을 확인했다. Apple 16은 Xcode에서 App Store Connect용 IPA로 내보냈고, 배포 서명과 iPhone·iPad 지원을 확인했다. 두 서명 패키지에서 시험 Firebase 설정을 포함한 공통 웹 파일 25개의 SHA-256이 일치했다. [후보 소스 및 자동 검증](https://github.com/KDYPOHO/peace-school-busan/actions/runs/45960878587)

| 서명 파일 | SHA-256 |
|---|---|
| 한반도-평화학교-Play-내부시험-46.aab | `743253029db3171e5f90ac1d63d947ee86e128d0f8ab90446bdc4a6bebe3e358` |
| 한반도-평화학교-TestFlight-내부시험-16.ipa | `726e5e297ba71ad8931213bd1d2bc34433421f75a4361ee06914ecab286cbc72` |

2026년 11월 27일 Play Console 내부 테스트 트랙에서 1.3.1(29)이 내부 테스터에게 제공 중인 상태를 확인했다. TestFlight 내부 그룹에서 마지막으로 확인한 빌드는 1.3.1(11)이다. 최신 확인에서는 App Store Connect 로그인이 필요했다. 이 TestFlight 그룹은 Xcode 빌드를 자동 배포하도록 설정되어 있어 승인 실기기 검증이 끝날 때까지 최신 후보 업로드를 보류한다.

### 운영 Firebase 연결 후보

커밋 `8be4e47310151f613d1637c9c88a078bba986571`에서 `PSB_BUILD_MODE=production`으로 Android 1.3.2(48)와 Apple 1.3.2(17)를 빌드하고 서명했다. 두 패키지는 Busan Peace School(`kdypoho`)에 연결하도록 설정되어 있으며, 패키지 안 공통 파일 27개의 SHA-256이 일치했다. Apple 시험 아카이브와 운영 아카이브의 공통 파일은 Firebase 설정 파일만 달랐다.

Android AAB는 `bundletool validate`를 통과했다. 등록된 Play 업로드 인증서와 서명이 일치했고 최소 API 24와 대상 API 36을 확인했다. Apple IPA는 App Store Connect용 내보내기에서 배포 서명을 확인했고 iPhone·iPad 15 이상을 지원한다. 두 패키지의 앱 ID는 `kr.busan.peaceschool`이다.

| 운영 후보 파일 | SHA-256 |
|---|---|
| 한반도-평화학교-운영-Android-48.aab | `012c9d06cf46ba6dedf3b753702a569aef75f07101ee34fa1938f2303a0232da` |
| 한반도-평화학교-운영-Apple-17.ipa | `37557cceba0e9770b3368ab901f6895c2f2dc6089f40bc1a02ea649b442da7f2` |

위 결과는 패키지 검사다. 운영 후보의 스토어 등록과 운영 Firestore 규칙 적용은 검증 후 진행한다. 가입 승인 실기기 검증에는 별도 시험 Firebase를 사용하는 시험판을 쓴다.

## 업로드 서명

Play Console에서 패키지와 사용 중인 업로드 인증서를 확인한다. 호환되는 업로드 키를 로컬 비밀 저장소에서 관리하고 다음 환경 변수를 로컬 프로세스에 주입한다.

- `ANDROID_UPLOAD_KEYSTORE`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`
- `ANDROID_VERSION_CODE`는 해당 앱에 올린 버전 코드보다 높은 정수

`npm ci`, `npx cap sync android` 후 `android` 디렉터리에서 `./gradlew bundleRelease`를 실행한다. `app/build/outputs/bundle/release/app-release.aab`의 서명과 인증서를 `jarsigner -verify`와 `keytool -printcert -jarfile`로 확인한다. 실제 제출은 해당 앱의 **내부 테스트** 트랙에서 진행한다. [대상 SDK 정책](https://support.google.com/googleplay/android-developer/answer/11926878) · [Play 앱 서명](https://support.google.com/googleplay/android-developer/answer/9842756) · [테스트 트랙](https://support.google.com/googleplay/android-developer/answer/9845334)

## 법령 및 스토어 검증

- 개인정보 수집·이용 고지는 「개인정보 보호법」 제15조·제16조·제22조, 파기와 권리 행사 안내는 제21조·제35조~제38조 및 실제 데이터 경로와 대조한다. 실제 운영 개시 전에 개인정보처리자와 문의 창구, 위탁·국외 이전, 보유 기간 및 운영자가 내려받은 명단의 파기 절차를 확인한다. [국가법령정보센터 개인정보 보호법](https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260911&lsiSeq=283839)
- Play Console의 계정 삭제 URL에는 배포 후 `https://kdypoho.github.io/peace-school-busan/?account=delete`를 입력하기 전에 인터넷 브라우저에서 로그인 → 재인증 → 참가 기록 삭제 결과를 확인한다. 이 URL과 앱 안 탈퇴 화면이 같은 삭제 경로를 사용한다. [Google Play 사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311) · [Apple 계정 삭제 지침](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/)
