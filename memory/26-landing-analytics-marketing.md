# 랜딩 유입추적·광고 성과 세팅 + 마케팅 인프라 결정

**최종 갱신**: 2026-07-18

filltime.vercel.app 광고/유입 추적 세팅 내역과 관련 아키텍처 결정 기록.
펴볼 때: "광고 돌리기 전 뭐 세팅했지", "UTM 어떻게 붙이지", "부정클릭 어떻게 하기로 했지".

## 추적 스택 결정: PostHog (GA4 아님)
- 근거: 앱이 이미 PostHog(posthog-react-native, us 호스트) → **같은 프로젝트 키 재사용**으로
  광고→랜딩→스토어클릭→앱 가입/리텐션이 한 대시보드 퍼널. GA4 강점(구글애즈 딥연동)은
  구글 광고 본격 집행 시 그때 추가.
- 구현(ss-042 `d889271`):
  - `instrumentation-client.ts` — posthog-js init (Next 15.3+ 규약, 키 없으면 no-op)
  - `src/components/StoreButtons.tsx`(클라이언트 추출) — **store_click 이벤트**
    {store: app_store/google_play, placement: hero/final_cta, available}. "곧 출시" 클릭도
    수집 = 안드로이드 수요 신호
  - Vercel production env: `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST` (앱 .env의 EXPO_PUBLIC_POSTHOG_KEY와 동일값)
  - pageview·UTM 5종·gclid·채널타입 자동 캡처 + **세션 리플레이 동작 중**
- 라이브 검증: pageview 캡처 POST 200(UTM 포함) + 스토어 클릭 후 이벤트 배치 POST 200

## UTM 숏링크 /go/<채널> (ss-042 `b96820a`)
- `src/app/go/[channel]/route.ts` — 302로 UTM 자동 부착, 광고엔 짧은 링크만 뿌리면 됨
- 등록 채널: insta(instagram·social) threads x yt(youtube) blog(content) cafe(community)
  kakao(message) ad(paid·cpc)
- **미등록 slug 폴백**: /go/아무거나 → utm_source=<slug>&utm_medium=link (등록 불필요)
- 캠페인: `?c=이름` → utm_campaign. utm_* 직접 지정 시 패스스루 우선
- 분석: PostHog Web Analytics(채널별 유입) + Insights 퍼널 "pageview→store_click"을
  utm_source로 브레이크다운

## 결정: 랜딩 백엔드 구축 안 함
- 입력폼 없음 = 저장할 데이터 없음. 전환 진실원장은 codeatlas API + PostHog(앱과 동일 프로젝트)
- 서버 로직은 route handler(/go, 어드민 프록시)로 충분 — 이 수준 유지
- 미래 트리거(그때 재검토): 리드폼 생길 때(그래도 route handler+기존 API 재사용) /
  Meta CAPI·구글 서버사이드 전환 API / Phase4 공개 프로필 웹
- ★남은 유일한 세팅 후보: **PostHog 리버스 프록시**(Next rewrites, 애드블로커 누락 10~20% 완화)
  — 광고비 본격 집행 직전에 1회

## 결정: 부정클릭 대시보드 직접 구축 안 함 (단계적 대응)
- 구조적 한계: 과금은 광고 플랫폼 단에서 발생 → 자체 시스템은 "차단기"가 아니라
  "탐지+증거수집기". 차단 실행 지점은 플랫폼 설정(구글 IP 제외 / 네이버 노출제한 IP)
- 단계: ①지금 — 없음(광고 미집행) ②광고 시작 — PostHog에 "동일IP 반복+0초이탈+paid 유입"
  인사이트 1개 추가 + 플랫폼 내장기능(구글 무효클릭 자동환급, 네이버 신고 절차)
  ③피해 정황 — ClickCease류 서드파티 비교 ④자체 구축은 서드파티로 안 풀릴 때만
- 앱 다운로드/소셜 광고 위주라 고CPC 키워드 대비 리스크 낮음

## 같이 보면 좋은 문서
- `19-growth-roadmap.md` — 성장 로드맵 v2 (Phase 0.5 게이트·추억팔이)
- `25-ios-subscription-launch-prep.md` — v1.0.1 배포 게이트
