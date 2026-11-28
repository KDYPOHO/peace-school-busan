---
name: dept-review
description: 평화학교 산출물(계획안·누리집·앱·홍보물·공문·예산)을 7개 부서가 결재 경로 순서대로 검수하고 결재 보고서를 만든다. "부서 검수", "결재 돌려줘", "7개 부서로 점검" 요청 시 사용.
---

# 7개 부서 결재 검수

인자: 검수 대상 경로(파일·폴더·PR 번호)와 선택적으로 산출물 유형. 예) `/dept-review www/` , `/dept-review plan 운영계획(안).docx`

## 0단계. 대상·유형 확정

1. 대상 경로를 확인한다. 유형을 안 주면 아래 기준으로 판단하고 보고서 첫 줄에 "유형 판단: ○○"으로 적는다.
   - `www/`, `android/`, `ios/`, `firestore.rules` → 앱
   - `home/` 또는 누리집 HTML → 누리집
   - .docx·.pdf·계획(안) 문서 → 계획안
   - 포스터·공고·카드뉴스 원고 → 홍보물
   - 공문·협조 요청 → 공문
   - 예산 표만 있는 문서 → 예산
2. 총괄 지침 `CLAUDE.md`를 다시 읽는다.

## 1단계. 무료 자동 점검 (필수, 비용 0)

```
python3 scripts/dept_check.py <대상> --format md
```

- 결과의 오류·경고를 각 부서 검수 요청에 함께 넘긴다.
- 오류가 있으면 보고서에 그대로 싣고, 부서 검수는 계속 진행한다.

## 2단계. 결재 경로에 따라 부서 서브에이전트를 차례로 호출

| 유형 | 결재 경로 (왼쪽부터 차례로) |
|---|---|
| 앱 | dev-team → design-team → operations-team → legal-team |
| 누리집 | dev-team → design-team → marketing-team → social-team → legal-team |
| 계획안 | operations-team → finance-team → marketing-team → design-team → legal-team |
| 홍보물 | marketing-team → design-team → social-team → operations-team → legal-team |
| 공문 | operations-team → marketing-team → legal-team |
| 예산 | finance-team → operations-team → legal-team |

- 서브에이전트는 **한 번에 하나씩, 표의 순서대로** 호출한다. 앞 부서의 보고 요약을 다음 부서 요청에 붙여서, 같은 지적을 반복하지 않고 이관 사항을 이어받게 한다.
- 각 호출 프롬프트에는 ① 대상 경로 ② 유형 ③ 1단계 자동 점검 결과 중 해당 부서 소관 ④ 앞 부서 요약 ⑤ "검수만 하고 파일은 수정하지 말 것"을 넣는다.
- 사용자가 "전 부서"를 요청하면 7개 부서를 모두 돌리되 순서는 dev → design → marketing → social → finance → operations → legal.
- 비용 절약: 사용자가 부서를 지정하면 그 부서와 legal-team만 돌린다.

## 3단계. 결재 보고서 작성

`docs/departments/reports/YYYY-MM-DD-<대상 이름>.md`로 저장한다. 양식:

```
# 부서 검수 결재 보고서
- 대상: … / 유형: … / 일시: YYYY. MM. DD.
- 자동 점검: 오류 N건, 경고 N건

## 결재란
| 부서 | 판정 | 상 | 중 | 하 |
|---|---|---|---|---|
| 개발팀 | 적합 | 0 | 1 | 2 |
| … | | | | |
| 총괄 | (사용자 결재 대기) | | | |

## 우선 조치 사항 (상 등급, 위험도 순)
## 부서별 상세 결과
## 미확인 항목 (사람 확인 필요)
```

## 4단계. 사용자 보고

- 결재란 표와 우선 조치 사항 3개 이내만 요약해서 알린다.
- 수정은 사용자가 지시한 경우에만 해당 부서에 "수정" 모드로 다시 맡긴다. 수정 뒤에는 그 부서와 legal-team만 재검수한다.
- 머지·배포·외부 게시·공문 발송은 하지 않는다.
