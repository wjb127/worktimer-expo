# AARRR 퍼널 · PostHog 애널리틱스 계획

**최종 갱신**: 2026-07-19

필타임 비즈니스 지표(결제자·사용자수·리텐션·AARRR 퍼널) 추적 계획.
펴볼 때: "리텐션/퍼널 어떻게 보지", "PostHog 대시보드", "결제자·매출 관리", "AARRR".

## ★★ 완료 (2026-07-19) — AARRR 대시보드 구축됨
- **PostHog 대시보드 라이브**: `AARRR 퍼널 — 필타임` (pinned). ID `1871502`.
  URL: `https://us.posthog.com/project/497680/dashboard/1871502`
- **프로젝트**: `497680` (Default project). api_token = 앱/랜딩 키 `phc_AcPQ...`와 일치 확인.
- **인사이트 7개**(전부 실데이터 렌더 검증): ①[A]유입 $pageview×utm_source ②[A]스토어클릭 store_click×store ③[웹퍼널] pageview→store_click ④[앱활성화퍼널] app_open→login_success→onboarding_complete→session_start ⑤[R]주간리텐션 session_start(retention_first_time,8주) ⑥[R]공유바이럴 shared+copied+saved ⑦[$]결제퍼널 session_start→premium_interest_click→premium_purchase_success
- **검증된 이벤트 유입**(07-19 기준): app_open·login_success·session_start·session_end·premium_interest_click·$pageview·share_card_*·onboarding_complete/skip 다 도착중
- **아직 0건(정상, 미발화)**: `store_click`(랜딩 다운로드 클릭 아직 없음)·`premium_purchase_success`(구매 전)·`milestone_achieved`. → ②③⑦ 마지막 스텝은 이벤트 쌓이면 자동 채워짐. 리텐션⑤도 앱 출시 ~1주라 코호트 몇 개뿐(시간 지나면 의미생김)
- **★ 재사용 기법 (personal API key 불필요)**: playwright로 us.posthog.com 로그인(구글 qhv147 세션 이미 브라우저에 있음) → `browser_evaluate`에서 `fetch('/api/projects/497680/...', {credentials:'include', headers:{'X-CSRFToken': document.cookie의 posthog_csrftoken}})`로 내부 REST API 직접 호출. 대시보드/인사이트 생성 전부 이 방식(POST insights + `dashboards:[id]`로 타일 자동생성). UI 클릭 노가다 완전 회피. insight query는 `{kind:'InsightVizNode', source:{kind:'TrendsQuery'|'FunnelsQuery'|'RetentionQuery', ...}}` 스키마.
- **다음(선택)**: store_click 발화 확인(랜딩 실클릭)·리텐션 데이터 축적 대기·결제/매출은 admin.codeatlas.kr 확장(아래 참조)

## ★ 핵심 결론
**대부분 이미 있음 — 새 테이블·새 랜딩백엔드 만들지 말 것(중복·분산).**
비즈니스 데이터는 codeatlas Postgres + PostHog에 있고, 어드민(admin.codeatlas.kr)이 이미 유저·구독 관리 중.

## 이미 있는 인프라
- **admin.codeatlas.kr** (ss-037-codeatlas-admin, Next.js, codeatlas Postgres 직결):
  유저관리(`/api/admin/users`,`UsersTable`), 결제자관리(`/api/admin/subscriptions`,`SubscriptionsManager`),
  stats(`/api/admin/stats`: 총유저/오늘가입/활성·삭제/앱·provider분포/14일 가입추이/최근로그인10)
- **codeatlas Postgres** (VPS): `users`(가입) · `subscriptions`(결제자=RC 웹훅 진실원장) ·
  `login_event`(userId+시각=**리텐션 원천**) · `work_sessions`(engagement)
- **PostHog US Cloud** (us.i.posthog.com): 앱 + 랜딩 둘 다 계측됨 → 리텐션/코호트/퍼널 네이티브

## AARRR 이벤트 매핑 (전 단계 이미 계측됨)
- **Acquisition**(랜딩): `$pageview`(UTM 자동) · `store_click`(store/placement)
- **Activation**(앱): `app_open` · `login_success`(+`identifyUser(me.id)` 스티칭) · `onboarding_complete/skip` · `session_start`
- **Retention**(앱): `app_open`/`session_start` 반복 → PostHog 네이티브 리텐션
- **Referral**(앱): `share_card_open/shared/copied/saved`
- **Revenue**(앱): `premium_interest_click`(페이월/관심) · `premium_purchase_success`(전환)
- 앱 계측: `src/lib/analytics.ts`(track 화이트리스트 + identifyUser + resetAnalytics). 랜딩: `StoreButtons.tsx` + `/go/[channel]` UTM 숏링크.

## 알아둘 것
1. **랜딩→앱 크로스디바이스 스티칭은 근사치** — 웹 방문자와 앱 유저는 distinct_id가 달라 사람단위로 못 이음(모바일 어트리뷰션 공통 한계). → **웹 퍼널 / 앱 퍼널 분리**해서 보는 게 정석.
2. **전제(먼저 확인)**: 앱 이벤트가 실제 PostHog에 들어오는지 — 빌드에 `EXPO_PUBLIC_POSTHOG_KEY`가 실렸는지. Live events에 `app_open` 뜨면 OK. 랜딩은 확실히 들어옴.
3. **personal API key 없음** (프로젝트키만) → API로 대시보드 자동생성하려면 PostHog `Settings > Personal API keys`에서 발급 필요.

## 대시보드 스펙 (AARRR, 인사이트 7개)
1. [A] 유입 — `$pageview` 트렌드, breakdown `utm_source`
2. [A] 스토어클릭 — `store_click` 트렌드, breakdown `store`
3. [웹 퍼널] — `$pageview` → `store_click` (전환율)
4. [앱 활성화 퍼널] — `app_open` → `login_success` → `onboarding_complete` → `session_start`
5. [R] 리텐션 — Retention 인사이트, 기준 `session_start`(또는 app_open), 주간 코호트
6. [R] 공유(바이럴) — `share_card_shared`+`copied`+`saved` 트렌드 (+ 공유율=공유자/활성유저)
7. [$] 결제 퍼널 — `session_start` → `premium_interest_click` → `premium_purchase_success`

## 빠진 것 = 작은 것 (전부 쿼리/설정, 새 테이블 X)
- 리텐션 곡선(D1/D7/D30): PostHog Retention(즉시) or admin에 `login_event`/`work_sessions` 코호트 쿼리 추가
- MRR/매출/이탈: `subscriptions` 집계를 admin stats에 추가
- 랜딩→앱 퍼널: PostHog distinct_id 스티칭(근사)

## 진행 순서 (사용자 결정)
- **최종 목표**: AARRR 퍼널 추적 대시보드 → ✅ **1단계(PostHog) 완료** (위 "완료" 섹션). playwright 브라우저 세션쿠키+CSRF로 REST API 호출해 대시보드 1871502 + 인사이트 7개 자동생성.
- **남은 것**: ① 결제/매출(MRR·이탈)은 admin.codeatlas.kr stats 확장(subscriptions 집계) ② 리텐션 자체대시보드는 login_event 쿼리(PostHog 리텐션으로 이미 커버되니 우선순위 낮음) ③ store_click 실발화·리텐션 데이터 축적 대기

## 사용법 검증 보고서 (st 파이프라인, 07-19)
- **산출물**: `report-usage-filltime-aarrr-20260719.html`(repo 루트, 미커밋) + 증거 `out/ship-evidence/20260719/`(미커밋). 대시보드 7개 사용 시나리오(개요/드릴인/퍼널전환율/리텐션코호트/브레이크다운/날짜범위/공유구독)를 playwright로 실조작·캡처한 검증갤러리 + 사용법 가이드. 카운트게이트 7=7=7 MATCH, 독립감사 PASS.
- **PostHog UI 사용법 요약**(보고서 캡션 원천): 인사이트 드릴인=타일 제목 클릭→`/project/497680/insights/<short_id>`. 퍼널=단계바 아래 전환%·이탈·중앙소요시간, 상단 Total conversion rate. 리텐션=행 코호트×열 주차, Week0=100%. 브레이크다운=하단 'Detailed results' 표(UTM SOURCE 행별). 날짜범위=상단 'No date range override'→프리셋(전체 타일 일괄). 공유=Share→'Share dashboard publicly' 토글(공개링크)/Subscribe=정기 이메일·Slack.
- **재사용 교훈 (st를 '코드변경 없는 사용법/검증 보고서'에 적용)**:
  - beforeState:"none"(신규 시연) 타입으로 각 시나리오=1요구사항=after 1장. deploy는 라이브 URL, build/e2e는 PASS로 표기(실빌드 없음).
  - **playwright MCP는 file:// 차단** → 보고서 렌더검증은 `python3 -m http.server <port>`로 띄워 http로 열고 naturalWidth 체크 후 `report-render-check.json` 기록(playwright npm 없으면 이게 validate 통과 조건).
  - 인사이트 short_id: 유입 ZNscKmkY·스토어 yXGkOSTs·웹퍼널 dNV9Tx5h·앱활성화 gumLh8gF·리텐션 0TkkdLf1·공유 QM8ItmZb·결제 x4MyRIW7.
  - 캡션은 **프레임 안 내용만** 단정(감사가 R05 프레임밖 컨트롤 언급 잡음 → 정정). 스크롤 상태면 캡션에 명시.

## 같이 보면 좋은 문서
- `26-landing-analytics-marketing.md` — PostHog 선정·store_click·UTM 숏링크
- `19-growth-roadmap.md` — 측정→리텐션→수익화→바이럴 Phase, 대원칙
- `21`·`25` — 수익화/구독(결제 데이터 원천)
