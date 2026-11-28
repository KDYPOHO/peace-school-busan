# 한반도 평화학교 부산 청년 과정 소개 누리집 (시안)

- 정적 HTML 한 장(`index.html`)과 공식 로고 이미지(`img/`)로 구성. 빌드·서버·유료 서비스 없음.
- `main`에 머지되면 GitHub Pages 배포 시 `/home/` 경로에 함께 올라감
  (예: `https://kdypoho.github.io/peace-school-busan/home/`). 앱(루트 경로)에는 영향 없음.
- 로고: `img/signature-ko.jpg`(국문 시그니처 좌우조합), `img/emblem.jpg`(2색조합 엠블럼_b), `img/symbol.png`(2색조합 심벌_b 투명본).
  원본 비율·색상 유지, 크기만 축소.
- 일정·정원·지원 내용은 2027 운영계획(안) 기준. 사무처 승인 전까지 `noindex` 유지.
- 로컬 미리보기: `npx http-server site -p 8081`
