# 출시 액션 플랜 — 사용자(위승빈) 액션 아이템

**최종 갱신**: 2026-07-04

수익화 준비 4종(애널리틱스/Sentry/온보딩/인앱리뷰) 코드 완료 후, **사용자가 직접 해야 하는 것들**의 체크리스트.
펴볼 때: "다음에 내가 뭐 해야 하지", 출시 준비 재개할 때. 기술 상세는 `09-launch-roadmap.md`.

표기: `[사용자]` = 사용자만 가능(계정·콘솔·결제·결정) / `[→Claude]` = 사용자가 재료 주면 Claude가 이어서 실행.

## A. 지금 바로 (기능 켜기 — 계정/키 발급)

- [ ] `[사용자]` **PostHog 계정**: us.posthog.com 가입 → 프로젝트 생성 → Project API Key 복사
  → 1Password `Dev-Clients` 금고에 저장 → `op://` 참조만 전달
- [ ] `[사용자]` **Sentry 계정**: sentry.io 가입 → React Native 프로젝트 생성 → 3종 확보:
  ① DSN ② org/project slug ③ Auth Token(소스맵 업로드용) → 1Password → `op://` 참조 전달
- [ ] `[→Claude]` 위 키 받으면: `.env` + EAS build env에 `EXPO_PUBLIC_POSTHOG_KEY`·`EXPO_PUBLIC_SENTRY_DSN` 주입,
  EAS secret에 `SENTRY_ORG/PROJECT/AUTH_TOKEN`, 실기기 이벤트/크래시 수신 검증
- [ ] `[사용자 결정]` **identifyUser 배선 여부** — 현재 로그인 이벤트 익명. 유저 단위 퍼널·리텐션 원하면
  `/me` id로 배선(추천). 결정만 하면 Claude가 구현

## B. 출시 준비 (콘솔/계정 작업 — 사용자 계정 필요)

- [ ] `[사용자]` **GCP 콘솔**(codeatlas-500015): OAuth 동의화면 "테스트"→"프로덕션" 전환 (안 하면 테스트 유저 외 구글로그인 불가)
- [ ] `[사용자]` **filltime.app 도메인 구매** (선점 권장 — 공유카드 워터마크·공개프로필 웹에 사용)
- [ ] `[사용자]` **Apple**: App Store Connect 앱 등록(Team 9Q26686S8R) + Apple Service ID·`.p8` 키 발급(계정삭제 revoke용)
- [ ] `[사용자]` **Play Console**: 앱 등록 (개발자 계정 없으면 $25 결제)
- [ ] `[사용자]` **사업자/연락처 정보 확정** → `[→Claude]` 개인정보처리방침·이용약관 웹페이지 생성 (스토어 필수)
- [ ] `[→Claude]` EAS production 빌드 → SHA-1 추출 → `[사용자]` GCP에 Android production OAuth 클라이언트 등록
  (현재 debug SHA만 등록 — 프로덕션 빌드에서 구글로그인 즉사 방지)
- [ ] `[→Claude]` 스토어 스크린샷·메타데이터·로케일별 앱 이름(필타임/Filltime) 준비

## C. 출시 직전 게이트 (보안 — 승인만 주면 Claude 실행)

- [ ] ★ 운영 백엔드 `DEV_LOGIN_ENABLED` OFF (현재 ON — /auth/dev-login 노출 중)
- [ ] 어드민 콘솔 비밀번호 변경 (현재 약함, 09 참조)
- [ ] codeatlas RLS 정비 (켜기 전 codeatlas_app 영향 검토)
- [ ] Apple 계정삭제 revoke 구현 (B의 .p8 받은 후 — 심사 리젝 사유)
- [ ] 스토어 빌드에 `EXPO_PUBLIC_E2E` 미설정 확인 (dev-login 버튼 노출 방지)

## D. 출시 후 (수익화 순서 — `10-viral-share-strategy.md` 프레임)

1. **측정 2주**: PostHog에서 D1/D7 리텐션·온보딩 완주율·공유카드 생성률·프리미엄 관심 클릭률 확인
   (D7 15~20% 미만이면 페이월보다 리텐션 수리 먼저)
2. **리텐션 인프라**: 홈화면 위젯 → Expo Push(주간 리캡 월요일 발송) → 스트릭 위험 알림
3. **결제**: RevenueCat + 구독 (프리미엄 = AI분석 + 카드 테마 + 상세통계 + 위젯 고급형).
   가격은 연간 우선 + 7일 무료체험, 관심 클릭 데이터 보고 결정. **공유 기능은 절대 유료화 X**
4. **성장**: 공개 프로필 웹(filltime.app/@id), ASO 반복
5. **기술부채**: TimerScreen 훅 분리, RN 신아키텍처, CI/CD

## 같이 보면 좋은 문서

- `09-launch-roadmap.md` — 출시 로드맵 전체 + 수익화 준비 4종 상세(커밋·env)
- `10-viral-share-strategy.md` — 비즈니스 방향성·수익모델 근거
