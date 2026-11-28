# 총괄 지침 (평화학교 사무국 업무 기준)

이 저장소의 모든 업무(계획안, 누리집, 앱, 홍보물, 공문, 예산)는 이 지침을 먼저 따름.

- 결정(결재)은 총괄: 강동엽, 민주평화통일자문회의 부산 북구협의회 자문위원 (사용자)
- 목적: 2026. 12. 18. 사무처장 간담회 보고용 「부산 청년 평화학교」 계획 수립 및 운영
- 대상: 전국에서 참가하는 청년·대학생 (모집·교통·숙박은 전국 단위 기준)
- 조직도: `docs/departments/org-chart.png`, 운영 방법: `docs/departments/README.md`

## 공통 규칙 10개

1. **공식 명칭**: 문서마다 첫 표기는 "민주평화통일자문회의", 이후 "민주평통". 직위는 실명 대신 직함(수석부의장, 사무처장 등)으로 표기
2. **공식 로고**: 공식 심벌·엠블럼·시그니처 원본만 사용. 비율·색상 변형, 회전·기울임·그림자·필터·애니메이션 금지, 크기 조절만 허용
3. **공문서체**: 한국어 공문서체. 보고서는 개조식(○ / - / ① 기호, "~함·~임·~ 예정" 명사형 종결). 날짜 `2026. 12. 18.(금)`, 금액 `1,234,000원` 또는 `123만 원`. 대외 안내문은 정중한 안내체 허용
4. **정치적 중립**: 특정 정당·정치인·정책에 대한 지지·비판 표현 금지. 강사·자료는 편향 검증 절차를 거침. 통일·평화 서술은 정부·민주평통 공식 자료 기준
5. **사실 확인**: 확인되지 않은 사실·수치는 "(안)", "추정", "확인 필요"로 표시. 과장 표현(최고·최초·유일·100% 등) 금지. 일정·정원의 기준은 `www/js/config.js`
6. **무료 원칙**: 무료 도구·자체 제작 우선. 유료 API·유료 요금제(Firebase Blaze 등)·유료 광고 도입 금지. 예산 단가는 추정치임을 명시하고 사무처 집행 기준과 대조 필요 표시
7. **개인정보 보호**: 개인 휴대전화 번호·주민등록번호·참가자 실명 명단을 저장소·공개물에 기재 금지. 공개 연락처는 개인정보 보호책임자 공개 주소(`www/js/config.js`)만 사용
8. **결재 절차**: 기안(담당 팀) → 검토(기획·품질팀) → 협조(관련 팀) → 최종 검수(법무·감사팀) → 결재(총괄). 검토 의견서는 `docs/departments/reports/`에 보관
9. **대외 공개 승인**: 병합·배포·SNS 게시·공문 발송·스토어 제출은 총괄 결재 후 사용자가 진행. 기관 로고·명칭이 들어간 앱·누리집의 외부 공개는 사무처 승인 후
10. **근거와 기록**: 모든 판단에 근거(파일:줄, 표 번호, 출처)를 붙이고, 확인하지 못한 것은 "미확인"으로 적음. 지적 사항과 점수는 점수판(`docs/departments/scoreboard.md`)에 누적

## 업무 분장 (7개 팀 × 6개 업무 = 42개)

| 팀 | 소관 | 서브에이전트 | 업무 명령 |
|---|---|---|---|
| 기획·품질팀 (1순위) | 기안 검토, 표기·사실 대조, 점수 관리 | `quality-team` | `/plan-rubric` `/plan-glossary` `/plan-factcheck` `/plan-scoreboard` `/plan-triage` `/plan-regression` |
| 교육운영팀 | 교육과정, 일정, 강사, 출결, 선발, 안전 | `education-team` | `/edu-curriculum` `/edu-schedule` `/edu-lecturer` `/edu-attendance` `/edu-selection` `/edu-safety` |
| 홍보팀 | 공고, 보도자료, 홍보물·로고, SNS, 청년아카이브, FAQ | `publicity-team` | `/pr-notice` `/pr-press` `/pr-design` `/pr-sns` `/pr-archive` `/pr-faq` |
| 정보화팀 | 앱·누리집, 보안, 무료 한도, 접근성 | `it-team` | `/it-feature` `/it-ci-fix` `/it-release` `/it-security` `/it-quota` `/it-accessibility` |
| 대외협력팀 | 공문, 장소·숙박·교통, 유관기관, 문의, 보고 자료 | `cooperation-team` | `/coop-letter` `/coop-venue` `/coop-partner` `/coop-inquiry` `/coop-briefing` `/coop-council` |
| 재무·회계팀 (검수 전용) | 예산(안), 검산, 집행·정산, 여비 | `finance-team` | `/fin-budget` `/fin-verify` `/fin-execution` `/fin-settlement` `/fin-free` `/fin-travel` |
| 법무·감사팀 (검수 전용, 마지막) | 개인정보, 중립, 표현, 저작권, 로고 승인, 약관 | `legal-team` | `/legal-privacy` `/legal-neutrality` `/legal-expression` `/legal-license` `/legal-logo` `/legal-terms` |

## 업무 처리 순서

1. 업무 전 `python3 scripts/dept_check.py <대상>` 자동 점검(무료) 실행
2. 새 산출물은 `/dept-produce`(6단계 기안 절차), 기존 산출물 검토는 `/dept-review`(결재 경로)
3. 개별 업무는 위 표의 명령을 직접 사용
4. 처음에는 기획·품질팀과 교육운영팀 2개 팀부터 사용하고 필요한 팀을 차례로 추가

## 저장소 기본 정보

- 앱: `www/` (웹·안드로이드·iOS 공통), 일정·정원은 `www/js/config.js`
- 시험: `npm test`, 자동 점검: `python3 scripts/dept_check.py`
