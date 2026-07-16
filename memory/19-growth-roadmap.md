# 성장 로드맵 — 수익화 & 리텐션 (리빙노트)

**최종 갱신**: 2026-07-15

필타임 출시 후 성장 로드맵. 측정 → 리텐션 → 수익화(구독) → 바이럴 → 소셜 순서.
펴볼 때: "다음 뭐 하지", "이 기능이 로드맵 어디에 맞지", "지금 우선순위 뭐지". **계속 업데이트하는 리빙노트.**
경쟁 근거는 `18-competitor-research.md`, 전략 상위는 `10-viral-share-strategy.md`, 액션 체크리스트는 `12-launch-action-plan.md`.

## 대원칙 (경쟁 리서치로 확정)
1. **광고 없음** — 프리미엄 집중앱 카테고리 표준. 세션 중 광고는 몰입·공유·브랜드 다 깨먹음.
2. **핵심 무료루프는 절대 유료화 X** — 타이머 기록 + 잔디 히트맵 + 연속일수 + 기본통계 + **공유카드**. 이게 바이럴 엔진이자 습관형성 구간(Strava가 기록·피드·공유 무료로 둔 논리).
3. **수익화는 리텐션 확인 후** — D7 15~20% 안 되면 페이월보다 리텐션 수리 먼저. 새는 바가지에 물 붓기 금지.
4. **순서 틀리면 죽음** — 콜드스타트라 Tier1(혼자서도 예쁜 공유) 먼저, 진짜 소셜(친구피드)은 유저 생긴 뒤.

## Phase 0 — 심사 통과 & 라이브 (지금) 🔵 진행중
- [ ] **양 스토어 심사 결과 대기** (Android "검토중" / iOS WAITING_FOR_REVIEW). 능동작업 없음.
- [ ] 리젝 시 사유별 대응(게스트모드 버튼으로 심사자 접근)
- 병행 가능: 랜딩(ss-042) 스토어 다운로드 버튼·스크린샷 보강(현재 마케팅 카피 없음)
- **게이트**: 양쪽 승인 = Phase 1 착수 신호

## Phase 1 — 측정 & 리텐션 진단 (라이브 +2~4주)
목표: 데이터로 리텐션 실태 파악. **감으로 기능 추가 금지.**
- [ ] PostHog 대시보드: **D1/D7 리텐션**, 온보딩 완주율, 공유카드 생성률, AI분석 탭 관심 클릭률, 세션종료 로깅 완료율
- [ ] 퍼널 확인: 설치 → 첫세션 → 재방문 → 공유
- **게이트(핵심)**: D7 리텐션
  - D7 ≥ 20% → Phase 3(수익화) 바로 가도 됨
  - D7 15~20% → Phase 2 일부(위젯·푸시) 먼저
  - D7 < 15% → Phase 2 전부 + 온보딩/코어루프 수리 우선. 페이월 보류.
- 근거: RevenueCat "Day0가 전부" + 습관앱 리텐션이 시간추적 1번 사망원인

### C 배치 빌드 진행 (2026-07-15)
접근: **RC+푸시 먼저 빌드검증 → 위젯 별도**(사용자 선택, 위젯 config 오류가 배치빌드 깨뜨리는 리스크 격리).
- 빌드1(RC+푸시 검증): Android preview APK 빌드 `6ea7e910-296a-46e2-8af0-11e9b5bb0bd8` 큐등록(gawall). expo-doctor 18/18 통과. RC키 EAS env 없음=OFF로 빌드(의도대로). → 실기기(SM-A165N) 설치·검증 예정
- iOS preview는 ad-hoc cert 필요라 후속. 위젯은 빌드2로 별도 사이클.

## Phase 2 — 리텐션 인프라 (여는 습관 만들기)
"시간추적 앱 사망원인 = 안 켜는 습관" 정면돌파. 마찰↓ + 재방문 훅.
- [ ] **홈화면 위젯** — 오늘 시간/잔디 상시노출(리텐션+스샷 소재). 최우선.
- [~] **Expo Push 클라이언트 완료(2026-07-15, OFF)** — `expo-constants`+`expo-notifications` plugin 추가, `notifications.ts registerForPushNotifications()`(Device가드→권한→getExpoPushTokenAsync→dedupe→POST, 전부 fail-safe), `profile.ts apiRegisterPushToken`→POST `/me/push-token`, App.tsx signedIn시 등록. tsc0·테스트38. **백엔드 엔드포인트 완료(2026-07-15, codeatlas-platform-api 커밋 `5b95ef4` 로컬)**: PushToken 모델+`push_tokens` 마이그레이션(IF NOT EXISTS) + `POST /me/push-token`(token unique upsert, 기기이관 대응) + RegisterPushTokenDto. nest build 통과. ★남은건 ①프로덕션 DB 적용(Supabase codeatlas 스키마 CREATE TABLE, 승인 대기) ②백엔드 배포(deploy.sh, 승인 대기) ③주간리캡 발송 크론(Phase2 활성화). 리캡 카드 로직은 이미 있음(Tier1).
- [ ] **주간 스트릭 전환** — 일간 아니라 **주 N일** 기준(Strava 논리: 일하는 날 들쭉날쭉 → 일간은 쉽게 깨져 좌절). + 스트릭 위험 알림("이번주 안 채우면 12주 연속 깨짐").
- [ ] **"오늘의 집중 점수"** 단일 숫자 UX 검토(RescueTime Pulse/Opal Score식) — 매일 여는 훅
- [ ] 세션종료 회고 강화(Session 벤치) — 한 줄 회고를 스탯·히트맵과 연결
- [ ] 자동시작/캘린더연동 등 기록 마찰 줄이기

## Phase 3 — 수익화 (구독, RevenueCat)
리텐션 확인 후 착수. **광고 아님, 구독.**
- [~] **RevenueCat SDK 플러밍 완료(2026-07-15, 스위치 OFF)** — `react-native-purchases@10.4.2` 설치 + `src/lib/purchases.ts`(analytics.ts 미러링 fail-safe 래퍼: initPurchases/logInPurchases/logOutPurchases/hasPremium/getCurrentOffering, 키없으면 완전 no-op·hasPremium항상false). App.tsx init 배선 + AuthContext에 logIn/logOut(identifyUser 짝). env `EXPO_PUBLIC_REVENUECAT_IOS_KEY`/`_ANDROID_KEY` 빈값=OFF. entitlement id `"premium"`. tsc0·테스트38(purchases 12신규). **네이티브 빌드는 위젯·푸시와 묶어서 1회**. ★남은 사용자액션: RC계정·API키·구독상품·offering 생성(Phase3 ON 시점)
- [~] **구독 서버 인프라 완료(2026-07-16)** — 백엔드(codeatlas-platform-api `da09e6f`): `subscriptions`(유저당 상태)+`subscription_events`(웹훅 원장, raw jsonb) 테이블, `POST /webhooks/revenuecat`(env `REVENUECAT_WEBHOOK_AUTH` 정확일치, 미설정=503, VPS `/root/.secrets/rc-webhook-auth`), `GET /me/subscription`(isPremium=active/trial/cancelled&&미만료). E2E 통과(401/200/TRIAL→trial 매핑/원장기록). **어드민 구독 탭 완료**(ss-037 `672a359`): admin.codeatlas.kr 구독 탭 — 요약카드/구독자목록/이벤트원장, 조회전용. ★남은 사용자액션: ①RC 계정·프로젝트 생성+스토어 연결 ②SDK 키 2개(EAS env 주입) ③구독상품 등록(ASC/Play) ④RC 웹훅 URL 등록: `https://api.codeatlas.kr/webhooks/revenuecat` + Authorization 헤더 = VPS `/root/.secrets/rc-webhook-auth` 값 ⑤entitlement `premium`+offering(Phase3 ON 시점)
- [ ] 구독상품 등록(양 스토어) + RC offering 구성 (↑ 사용자액션)
- [ ] **프리미엄 = AI분석 + 카드테마/꾸미기 + 상세통계 + 무제한 카테고리 + 위젯 고급형** (공유·기본기록은 무료 유지)
- [ ] **페이월 위치**: 온보딩 끝 + "당신의 시간패턴 분석중..." 로딩 직후(Day0 80% 노림). + **contextual paywall**(AI분석/프리미엄카드/상세통계 탭할 때 그 자리 업셀 — "막는"게 아니라 "완성"하는 톤)
- [ ] **가격**: 연간 기본선택 + "월대비 X% 절약" 배지 + 7일 무료체험. 플랜 2~3개만. 한국 **월 3,900~5,900원 / 연 29,000~49,000원** 구간. 관심클릭 데이터 보고 확정. **너무 싸게 잡지 말 것**(고가가 전환 오히려↑).
- [ ] (선택) 평생결제 옵션 — 구독 저항 유저용 저가 앵커(Flow $39.99, Focus To-Do $11.99 선례)
- [ ] (PMF 강하면) Reverse Trial A/B — 결제정보 없이 프리미엄 먼저(Strava 방식)
- 근거: 18번 §3 RevenueCat + Strava 유료경계

## Phase 4 — 바이럴 & 성장 (공유 루프 조이기)
- [ ] **공유카드 브랜딩 + 앱 딥링크 필수** — Strava 루프: 브랜디드 카드=무료광고, 클릭링크=전환경로 닫기. (카드 자체는 이미 있음, 브랜딩·링크 강화)
- [ ] **주간/월간 "필타임 Wrapped"** 정해진 요일 발행 → 희소성·리추얼화. **"측정결과가 아니라 정체성"으로 프레이밍**("이번주 상위 X% 딥워커"), archetype/퍼센타일, 약간 미화된 자기모습(Spotify Wrapped 원리).
- [ ] 공유 트리거 2지점: **세션종료 직후** + **주간리캡 발행시**
- [ ] **공개 프로필 웹**(filltime.vercel.app/@id or 도메인 재검토) — 앱 없어도 잔디 공개 = 미설치자 유입 깔때기(Tier2)
- [ ] ASO 반복(스토어 키워드·스샷·리뷰)

## Phase 5 — 진짜 소셜 레이어 (유저 생긴 뒤)
콜드스타트 회피 위해 마지막. Strava의 심장.
- [ ] 친구 팔로우 + 피드 + Kudos(좋아요)
- [ ] **이중 성취 트랙**(Strava KOM+Local Legend): "최장 집중(속도형)" + "연속일수/누적(일관성형)" 둘 다 보상 → 파워유저 쏠림 방지
- [ ] **경쟁 범위 좁히기**: 전세계 랭킹 X → 친구/같은목표 그룹/주간 코호트 리더보드(이길 수 있어야 계속 옴)
- [ ] **Friend Streak 넛지**(Duolingo 2024): 동료가 안 하면 찌르기 = 상호책임
- [ ] 챌린지/그룹(열품타 직장인판)

## 병행 트랙 (Phase 무관 상시)
- 기술부채: TimerScreen 훅 분리, RN 신아키텍처, CI/CD, EAS Workflow(세팅됨)
- 마케팅: 랜딩 보강, SNS 도그푸딩(내 잔디·리캡 공유), 타겟 커뮤니티(프리랜서/N잡러/졸업한 열품타 유저)

## 현재 자산 (2026-07-15 기준, 뭘 이미 갖고 있나)
- ✅ Tier1 완성: 공유카드 3종(종합/업적/주간), 업적 14종+마일스톤 모달, 주간 리캡 카드
- ✅ 측정: PostHog(D1/D7 등) + Sentry 붙음, identifyUser 배선
- ✅ 랜딩: filltime.vercel.app(개인정보처리방침/약관/사업자정보)
- ✅ 세션↔할일 결합(session_todos) — Focus To-Do가 전면에 내세우는 그 기능
- ✅ 백엔드 하드닝 완료, CF 이관, 구글로그인 동작
- ⏳ AI분석 탭 "출시예정" locked → Phase3 프리미엄 언락 대상
- ⏳ 위젯·Expo Push 미구현 → Phase2

## 리스크 재확인 (10번 문서)
1. 리텐션=켜는 습관(1번 사망원인) → Phase2가 존재이유
2. 노동시간 자랑 역풍 → "꾸준함/몰입" 프레임, 번아웃 조장 금지
3. 콜드스타트 → Tier1 먼저, 소셜 나중(Phase5)
4. 도그푸딩 함정 → 초기타겟 "나같은 사람"으로 좁히기

## 같이 보면 좋은 문서
- `18-competitor-research.md` — 이 로드맵의 경쟁 근거
- `10-viral-share-strategy.md` — 상위 비즈니스 전략(Tier1~3 기능)
- `12-launch-action-plan.md` — D섹션 수익화 순서 + 사용자 액션
- `16`·`17` — Android/iOS 심사 제출 상태
