# 멀티테넌시 아키텍처 합의문 — Codex v1.0 후보안 = 최종 텍스트 (위승빈 승인 대기)

**최종 갱신**: 2026-07-17 (Codex v1.0 후보안을 Claude 검토 승인 — 이견 0, 재작성 불필요. 승인 시 이 텍스트가 그대로 docs/architecture/tenancy.md 기초가 됨)
★ 후보안 확정 내용: 거버넌스 = 양 에이전트 검토 의견 기록 → **위승빈 최종 승인**(3자 만장일치 아님) / 신뢰체인에 azp 추가·공유 audience면 production 인증 불허·푸시/웹훅/어드민/서비스 토큰도 앱 scope 필수 / 불변식 10개 / **레거시 JWT: 즉시 폐기(강제 재로그인)가 기본 선택**(§6.5 — 문서 승인 = 이것도 승인) / 게이트 = Phase 0~3 완료 + 7조건 + diary 배포 전 전체 회귀 / 트리거는 자동결정 아닌 재검토 트리거 / 소유권 불명확 시 수정 금지·보고

codeatlas 플랫폼 격리 통제 합의안. 펴볼 때: "diary 재개 조건", "새 앱 추가 절차", "테넌시 규칙".
★ v1.0 추가 확정: **AppActor {userId, appId} 객체 전달**(원시 파라미터 2개 대체) / **registry startup validation**(중복 appId·aud·route prefix = 부팅 실패) / **멀티세션 제어 = Phase 0 하드 게이트로 승격** / 교차 **라우트 403·객체 404** 구분 / 실행순서 = WIP checkpoint·인계 → 헌장·Registry → aud 기반 JWT·AppScopeGuard → AppActor·격리테스트(**여기 통과 = diary 재개**) → 기존 DB 증분 강화 / **공유 auth 소유권 = 플랫폼 세션으로 인계 확정**(diary WIP는 checkpoint commit 후)

## 대원칙 (합의)
- **문서 = 작업 품질 제어 / 코드·DB·CI = 보안 제어** — 두 축을 분리한다
- 문서는 짧은 불변식 + 온보딩 지도만. **Registry가 런타임 SSOT** (TS 단일 파일, YAML+코드젠 아님 — 합의됨)
- 실제 격리는 JWT AppContext · Guard · 통합 테스트가 담당
- 신뢰 체인: 검증된 OAuth aud → AppRegistry → JWT {sub, appId} → 전역 TenantGuard + @AppScope → (userId, appId) 쿼리 → 복합 DB 제약

## 불변식 5 (docs/architecture/tenancy.md에 들어갈 내용)
1. 클라이언트 body/header의 appId는 인증 근거로 사용 금지 (**aud 기반 서버 판정** — 앱마다 자체 OAuth 클라이언트 필수. 예외: 게스트/dev는 aud 없음 → registry 검증 + 저권한으로 한계 수용, 문서화)
2. 모든 JWT에는 서버가 결정한 appId 포함. **레거시 토큰: worktimer 기본 귀속 금지(v1.0 폐기)** — sub로 DB 조회해 소속 확인(jwt.strategy가 이미 user 행 조회하므로 추가 쿼리 0), 단일 소속만 재발급, 모호/없음은 401. 호환기간 후 appId 없는 토큰 전부 401. **대안 B: refresh 전량 폐기+강제 재로그인(유저 ~15명이라 Claude·Codex 모두 B 추천) — 사용자 결정 대기**
3. 앱 전용 API에는 앱 스코프 필수
4. 사용자 소유 데이터 접근은 appId + userId 필수 — **교차 테넌트 객체 접근은 404** (403 금지: 존재 자체 비노출, OWASP BOLA)
5. 신규 앱은 AppRegistry 등록 + 교차 테넌트 테스트 통과 없이 병합 금지

## Phase (합의)
- **P0 문서·SSOT** (반나절, diary WIP 무충돌): docs/architecture 4문서(tenancy/app-onboarding/data-ownership/security-tests) + AGENTS.md·CLAUDE.md 포인팅 + `src/apps/registry.ts`(appId·번들ID·OAuth aud·허용모듈·푸시프로젝트). 모바일 레포엔 server-integration.md 요약만
- **P1 신원·경계** (1~2일, auth 소유권과 한 몸): aud→registry→appId 판정, body appId 제거, JWT {sub,appId}+전환, TenantGuard+@AppScope, 서비스는 명시적 (userId, appId) 파라미터 (**ALS·repository 계층 보류** — 앱 3개↑ 또는 크로스커팅 기능이 도입 트리거)
- **P2 검증 게이트** (P1과 같은 PR): 교차 테넌트 CI 스위트 — 타앱 라우트/객체 접근 전부 404, 신규 앱 온보딩 = registry 한 항목 + 스위트 자동 통과
- **P3 DB 2차 방어선**: `User unique(appId, id)` + **diary 신규 테이블은 day 1 composite FK** (appId,userId)→User(appId,id). worktimer 기존 테이블 소급은 후속 유지보수 윈도우
- **P4 멀티세션 운영 규약**: 세션당 git worktree + 공유코어(auth/core/schema/registry)는 플랫폼 세션 단일 소유 + /add-app 스킬 + 공유코어 수정 감지 훅

## Diary 재개 게이트 (v1.1 — "Phase 2~4 통과" 표현 폐기, 7조건 고정)
①Registry가 런타임 SSOT로 동작 ②서버가 appId 판정+JWT·refresh 포함 ③AppScopeGuard 누락 시 fail-closed(공개 라우트는 명시적 public만) ④서비스가 명시적 AppActor로 소유권 확인 ⑤라우트 교차 403·객체 교차 404 테스트 통과 ⑥body appId 위조·appId 없는 JWT 테스트 통과 ⑦신규 diary 테이블 day-one 격리 제약.
**worktimer 기존 테이블 복합 FK 소급은 게이트 제외 확정.** 응답 정책: 라우트 403 / 객체 404 / 무효 토큰 401 / 객체 API에서 403 금지.
추가 확정: 게스트·dev는 Registry 등록 **AppIdentityResolver**로 판정 / 문서는 tenancy.md + app-onboarding.md 2개로 축소(커지면 분리)

## 후순위 (합의)
- Prisma 커스텀 린트, RLS → 1차 보안 경계 완성 후 단계 도입 (RLS는 runtime DB role 분리 + FORCE ROW LEVEL SECURITY 설계 선행 — 현재 owner 접속이라 무력)
- 앱별 스키마/DB/서비스 분리는 예외 승격만: 민감 데이터·계약상 독립성·트래픽 편중·매각 가능성

## 미결 (사용자 결정 1개)
- [ ] **위승빈 최종 승인** — 승인 시 ①합의문 확정(레거시 JWT 즉시폐기 기본선택 포함) ②Phase 0(diary WIP checkpoint·인계) 착수
- [x] 레거시 JWT 방식 → 후보안 §6에 통합(DB 조회 전환 + 재로그인 허용 시 즉시 폐기 기본)
- [x] 실행 소유권 = 플랫폼 세션(Registry·JWT·Guard·테스트), diary 세션은 checkpoint 후 인계 — 쌍방 동의
- 합의문 전문은 대화 로그(07-17)에 있음 — Phase 1에서 docs/architecture/tenancy.md로 레포 반입

## 같이 보면 좋은 문서
- `22-security-audit-fixes.md` — 이 플랜의 배경 (JWT appId 구멍·멀티세션 충돌 실사고)
- `14-sdui-app-factory-strategy.md` — 앱 팩토리 상위 전략
