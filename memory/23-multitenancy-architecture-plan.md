# 멀티테넌시 아키텍처 플랜 — 3자 합의본 (위승빈·Claude·Codex)

**최종 갱신**: 2026-07-17

codeatlas 플랫폼에 앱이 추가될 때마다 생기는 격리 영역을 어떻게 통제할지의 합의안.
펴볼 때: "diary 재개 조건", "새 앱 추가 절차", "테넌시 규칙 어디 있지". **구현 전 — 실행 소유권 미정.**

## 대원칙 (합의)
- **문서 = 작업 품질 제어 / 코드·DB·CI = 보안 제어** — 두 축을 분리한다
- 문서는 짧은 불변식 + 온보딩 지도만. **Registry가 런타임 SSOT** (TS 단일 파일, YAML+코드젠 아님 — 합의됨)
- 실제 격리는 JWT AppContext · Guard · 통합 테스트가 담당
- 신뢰 체인: 검증된 OAuth aud → AppRegistry → JWT {sub, appId} → 전역 TenantGuard + @AppScope → (userId, appId) 쿼리 → 복합 DB 제약

## 불변식 5 (docs/architecture/tenancy.md에 들어갈 내용)
1. 클라이언트 body/header의 appId는 인증 근거로 사용 금지 (**aud 기반 서버 판정** — 앱마다 자체 OAuth 클라이언트 필수. 예외: 게스트/dev는 aud 없음 → registry 검증 + 저권한으로 한계 수용, 문서화)
2. 모든 JWT에는 서버가 결정한 appId 포함 (**레거시 토큰 전환**: appId 없으면 'worktimer' 간주, refresh 회전 시 재발급 — access 15분이라 창 짧음)
3. 앱 전용 API에는 앱 스코프 필수
4. 사용자 소유 데이터 접근은 appId + userId 필수 — **교차 테넌트 객체 접근은 404** (403 금지: 존재 자체 비노출, OWASP BOLA)
5. 신규 앱은 AppRegistry 등록 + 교차 테넌트 테스트 통과 없이 병합 금지

## Phase (합의)
- **P0 문서·SSOT** (반나절, diary WIP 무충돌): docs/architecture 4문서(tenancy/app-onboarding/data-ownership/security-tests) + AGENTS.md·CLAUDE.md 포인팅 + `src/apps/registry.ts`(appId·번들ID·OAuth aud·허용모듈·푸시프로젝트). 모바일 레포엔 server-integration.md 요약만
- **P1 신원·경계** (1~2일, auth 소유권과 한 몸): aud→registry→appId 판정, body appId 제거, JWT {sub,appId}+전환, TenantGuard+@AppScope, 서비스는 명시적 (userId, appId) 파라미터 (**ALS·repository 계층 보류** — 앱 3개↑ 또는 크로스커팅 기능이 도입 트리거)
- **P2 검증 게이트** (P1과 같은 PR): 교차 테넌트 CI 스위트 — 타앱 라우트/객체 접근 전부 404, 신규 앱 온보딩 = registry 한 항목 + 스위트 자동 통과
- **P3 DB 2차 방어선**: `User unique(appId, id)` + **diary 신규 테이블은 day 1 composite FK** (appId,userId)→User(appId,id). worktimer 기존 테이블 소급은 후속 유지보수 윈도우
- **P4 멀티세션 운영 규약**: 세션당 git worktree + 공유코어(auth/core/schema/registry)는 플랫폼 세션 단일 소유 + /add-app 스킬 + 공유코어 수정 감지 훅

## Diary 재개 게이트 (Codex 최종안 채택)
**Phase 2~4 통과 전까지 diary 기능 개발·배포 재개 금지.**
게이트 4조건: ①JWT에 서버 결정 appId ②worktimer 토큰 → diary API 404/403 ③타앱 userId/objectId 접근 실패 ④신규 앱 등록 = registry+테스트 (문서 복사 아님)
- ⚠️ 해석 플래그(Codex 재확인 필요): P3 범위는 "User unique + diary 신규 테이블 FK"까지가 게이트, **worktimer 기존 테이블 소급은 게이트 제외** (Claude 입장 — diary가 라이브 DB 마이그레이션에 인질 잡히지 않게)

## 후순위 (합의)
- Prisma 커스텀 린트, RLS → 1차 보안 경계 완성 후 단계 도입 (RLS는 runtime DB role 분리 + FORCE ROW LEVEL SECURITY 설계 선행 — 현재 owner 접속이라 무력)
- 앱별 스키마/DB/서비스 분리는 예외 승격만: 민감 데이터·계약상 독립성·트래픽 편중·매각 가능성

## 미결
- [ ] 실행 소유권: P1~2를 diary 세션(auth WIP 보유)이 하나, 그쪽 WIP 커밋 후 플랫폼 세션이 가져오나
- [ ] P0 착수 GO 사인

## 같이 보면 좋은 문서
- `22-security-audit-fixes.md` — 이 플랜의 배경 (JWT appId 구멍·멀티세션 충돌 실사고)
- `14-sdui-app-factory-strategy.md` — 앱 팩토리 상위 전략
