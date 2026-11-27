# 평화 학교 Android 내부 테스트 후보

앱 식별자는 `kr.busan.peaceschool`, 표시 버전은 `1.3.0`이다. Android와 iOS는 같은 커밋의 `www/`를 사용한다. Android 대상 SDK는 36이다. 로그인 화면의 국문 시그니처는 제공된 민주평화통일자문회의 원본이며, 앱 아이콘과 화면의 심벌은 기존 2색 공식 자산을 쓴다.

## 후보 패키지와 설치 시험

1. GitHub Actions에서 같은 후보 커밋의 Android 워크플로를 연다. `peace-school-debug-apk`는 Android 설치 시험용이고 `peace-school-unsigned-aab`는 서명 전 번들이다. 에뮬레이터 실행 결과는 해당 잡의 시작 검사와 테스트 XML에서 확인한다.
2. iOS를 빌드할 때 `npm ci`와 `npx cap sync ios` 후 Xcode의 `App` 스킴을 사용한다. Android APK, AAB 및 iOS의 `App.app/public` 모두에 `python3 scripts/verify_web_assets.py <경로>`를 실행해 공통 파일을 비교한다.
3. 실제 기기에서는 별도 시험 Firebase로 신청과 출결 동기화, 로그인, QR 권한 허용·거절·재요청, 수강번호 입력, 재시작, 탈퇴를 확인한다. 가상 정보만 사용하고 기기·OS·앱 빌드·커밋을 기록한다.

## 업로드 서명

Play Console에서 패키지와 사용 중인 업로드 인증서를 확인한다. 호환되는 업로드 키를 로컬 비밀 저장소에서 관리하고 다음 환경 변수를 로컬 프로세스에 주입한다.

- `ANDROID_UPLOAD_KEYSTORE`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`
- `ANDROID_VERSION_CODE`는 해당 앱에 올린 버전 코드보다 높은 정수

`npm ci`, `npx cap sync android` 후 `android` 디렉터리에서 `./gradlew bundleRelease`를 실행한다. `app/build/outputs/bundle/release/app-release.aab`의 서명과 인증서를 `jarsigner -verify`와 `keytool -printcert -jarfile`로 확인한다. 실제 제출은 해당 앱의 **내부 테스트** 트랙에서 진행한다. [대상 SDK 정책](https://support.google.com/googleplay/android-developer/answer/11926878) · [Play 앱 서명](https://support.google.com/googleplay/android-developer/answer/9842756) · [테스트 트랙](https://support.google.com/googleplay/android-developer/answer/9845334)

## 법령 및 스토어 검증

- 개인정보 수집·이용 고지는 「개인정보 보호법」 제15조·제16조·제22조, 파기와 권리 행사 안내는 제21조·제35조~제38조 및 실제 데이터 경로와 대조한다. 실제 운영 개시 전에 개인정보처리자와 문의 창구, 위탁·국외 이전, 보유 기간 및 운영자가 내려받은 명단의 파기 절차를 확인한다. [국가법령정보센터 개인정보 보호법](https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260911&lsiSeq=283839)
- Play Console의 계정 삭제 URL에는 배포 후 `https://kdypoho.github.io/peace-school-busan/?account=delete`를 입력하기 전에 인터넷 브라우저에서 로그인 → 재인증 → 참가 기록 삭제 결과를 확인한다. 이 URL과 앱 안 탈퇴 화면이 같은 삭제 경로를 사용한다. [Google Play 사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311) · [Apple 계정 삭제 지침](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/)
