# codeatlas 플랫폼 멀티테넌시 아키텍처 합의문 v1.2 (전문)

**최종 갱신**: 2026-07-17
**상태**: **v1.2 승인·Phase 0~3 구현 + codex 검수 3라운드 완료** (backend `2358912`→`55ee9cc`→`cc2aab8`) — 배포는 사용자 승인 대기. 미해결 정책 1건: 게스트 body appId(암호학 바인딩 불가 — 토론 대기). ⚠️교훈: python 치환은 assert 필수(라운드2 무산 사고)
구현 요점: registry.ts(SSOT+startup validation) / aud→appId 서버판정 / JWT {sub,appId}+레거시 A안 / @AppScope·TenantGuard·ScopeAnnotationValidator(fail-closed 부팅) / AppActor 전 서비스 / User @@unique([appId,id]) / 교차 테넌트 e2e 8케이스(유닛26+e2e24 통과). diary WIP는 `diary-wip-checkpoint-20260717` 브랜치 격리
당사자: 위승빈(최종 결정권자) · Claude(플랫폼 구현·리뷰) · Codex(구현·리뷰)

펴볼 때: "diary 재개 조건", "새 앱 추가 절차", "테넌시 규칙", "레거시 토큰 전환".
이 문서는 docs/architecture/tenancy.md의 기초가 된다. 변경은 두 에이전트의 검토
의견을 기록한 뒤 위승빈이 최종 승인한다. 이견 항목은 합의 전까지 구현하지 않고
보수적인 현행 동작을 유지한다.

## 1. 원칙
- 문서는 작업 품질을 제어하고, 코드·DB·CI는 보안 경계를 강제한다.
- 문서는 짧은 불변식과 온보딩 지도만 담는다.
- src/apps/registry.ts가 유일한 런타임 SSOT다.
- 클라이언트가 제공하는 앱 식별자는 선택값일 수 있지만 권한 근거가 될 수 없다.
- 앱 전용 API는 scope 누락 시 허용하지 않는 fail-closed 방식으로 동작한다.
- 신규 앱은 Registry 등록과 교차 테넌트 테스트 없이 병합·배포할 수 없다.

## 2. 신뢰 체인
검증된 OAuth aud/azp/client_id → AppIdentityResolver → AppRegistry
→ access JWT { sub, appId } → AppScopeGuard → AppActor { userId, appId }
→ appId + userId 소유권 조건 → DB 복합 제약 → 교차 테넌트 통합 테스트

- OAuth 식별자가 앱별로 유일하게 매핑될 때만 appId를 발급한다.
- 동일 OAuth audience를 여러 앱이 공유해 앱 구분이 불가하면 production 인증을 허용하지 않는다.
- 게스트 인증은 앱별 서버 설정으로 scope를 제한한다. dev login은 production 비활성.
- 푸시·웹훅·관리자·서비스 토큰도 명시적인 앱 scope를 가져야 한다.

## 3. 공통 불변식
1. body/header의 appId, userId는 권한 판단에 사용하지 않는다.
2. 모든 신규 access JWT에는 서버가 결정한 { sub, appId }를 포함한다.
   refresh token은 opaque(DB 해시 저장)이며 appId를 담지 않는다 — 회전 시
   refresh record의 userId로 User를 조회해 서버가 appId를 복원하고,
   재발급되는 access JWT에 포함한다.
3. 앱 전용 route는 AppScopeGuard 적용이 필수다.
4. 다른 앱의 route 접근은 403으로 처리한다.
5. 다른 앱 또는 사용자의 객체 접근은 존재 여부를 숨기기 위해 404로 처리한다.
6. object ID만으로 사용자 소유 데이터를 조회·수정·삭제하지 않는다.
7. 앱 데이터 service는 검증된 AppActor를 필수 인자로 받는다.
8. 신규 앱 데이터에는 처음부터 appId와 소유권 제약을 적용한다.
9. Registry에 앱을 추가하면 해당 앱의 교차 격리 테스트가 자동 생성·확장돼야 한다.
10. 공유 코어는 동시에 한 세션만 수정한다.

## 4. Registry
- src/apps/registry.ts를 TypeScript SSOT로 사용, `as const satisfies AppRegistry`.
- YAML과 필수 코드젠은 도입하지 않는다. 런타임·테스트가 직접 import.
- key/value 불일치, 중복 OAuth audience, route prefix 충돌은 startup validation으로 부팅 실패.
- ALLOWED_APP_IDS 등 파생 목록은 Registry에서 생성한다.
- 외부 비TypeScript 소비자가 실제로 생길 때만 JSON 단방향 emit을 추가한다.

## 5. 컨텍스트 전달
현재 단계에서는 ALS와 전면적인 tenant repository를 도입하지 않는다.
`type AppActor = { userId: string; appId: AppId }`
- Guard가 검증한 AppActor를 controller가 service에 명시적으로 전달한다.
- 요청 body에서 받은 객체를 AppActor로 사용하지 않는다.
- 앱 3개 이상 / 공용 서비스 증가 / scope 필터 누락 반복은 자동 도입 조건이
  아니라 repository 재검토 트리거다.
- ALS는 로깅·추적처럼 권한 판단과 무관한 용도로만 검토한다.

## 6. 레거시 토큰 전환 — A안 확정
B안(refresh 전량 폐기 + 강제 재로그인)은 **기각**한다.
사유: 게스트는 로그인마다 guest-{uuid} 신규 계정이 생성되고 복구용 자격증명이
없어, 폐기 시 기록 있는 게스트가 기존 계정에 영구히 재접근 불가. 판단 기준은
사용자 수가 아니라 계정의 복구 가능 여부다. 게스트 데이터가 전부 폐기 가능하다고
별도 확인된 경우에만 B를 재검토한다.

A안 전환 규칙:
1. appId 없는 기존 access JWT는 access TTL 동안만 임시 허용한다.
2. JwtStrategy가 sub로 조회한 user.appId를 임시 scope로 사용한다
   (access 인증 경로 — JwtStrategy는 이미 User를 조회하므로 추가 쿼리 없음).
3. 신규 토큰은 반드시 { sub, appId }로 발급한다.
4. 전환 기간 이후 appId 없는 access JWT는 401 처리한다.
5. 신규 JWT의 payload.appId와 DB의 user.appId가 다르면 401 처리한다.
6. 어떤 경우에도 worktimer를 기본값으로 하드코딩하지 않는다.

refresh 회전은 JwtStrategy를 거치지 않는다 — rotateRefresh()에 이미 있는
User 조회를 토큰 발급 앞으로 이동해 추가 쿼리 없이 appId를 복원한다.
기존 refresh token은 유지된다.

## 7. DB 제약
- **선행 조건: User에 @@unique([appId, id]) 추가** — (appId, userId) 복합 FK의
  부모 키 제약 (현 스키마에 없음).
- 신규 Diary 및 향후 앱 테이블은 appId를 포함한다.
- 신규 사용자 소유 테이블은 가능한 경우 (appId, userId) → User(appId, id) 복합 FK 적용.
- 기존 Worktimer 테이블의 복합 FK 전환은 빅뱅으로 진행하지 않는다.
  우선 JWT·Guard·소유권 조건·통합 테스트로 보호하고, appId backfill과 제약
  추가는 별도 마이그레이션 윈도우(점검·백업 후 증분)에서 수행한다.
- RLS는 non-owner runtime role + FORCE ROW LEVEL SECURITY 설계 이후 검토한다.

## 8. 멀티세션 제어
- auth, core, schema.prisma, Registry는 플랫폼 세션이 단일 소유한다.
- 앱별 기능은 별도 branch/worktree에서 작업한다.
- 공유 파일 수정 전 checkpoint commit과 명시적 인수인계를 수행한다.
- 미커밋 변경이 있는 동일 파일을 두 에이전트가 동시에 수정하지 않는다.
- 공유 코어 소유권이 불명확하면 수정하지 않고 사용자에게 보고한다.

## 9. 실행 순서
Phase 0 — WIP와 소유권 정리 (하드 게이트):
①Diary WIP를 전용 branch/worktree에 checkpoint commit(보존용, 자동 병합·배포 금지)
②Diary 전용 변경과 공유 auth 변경 분류 ③공유 auth 작업을 플랫폼 세션에 인계
④파일별 단일 writer 규칙 적용

Phase 1 — 헌장과 Registry:
①docs/architecture/tenancy.md(이 문서 기반) ②AGENTS.md·CLAUDE.md에서 동일 문서 참조
③src/apps/registry.ts + startup validation ④docs/architecture/app-onboarding.md
⑤모바일 저장소에는 해당 앱 server-integration 요약만

Phase 2 — 인증과 앱 스코프:
①검증된 OAuth 식별자 → Registry 매핑 ②서버가 최종 appId 결정
③신규 access JWT에 { sub, appId } + refresh 회전 시 appId 복원
④레거시 전환 규칙(6절) 적용 ⑤AppScopeGuard + 앱별 scope ⑥body appId 위조·불일치 거절

Phase 3 — 권한 전달과 격리 검증:
①controller에서 검증된 AppActor 구성 ②앱 service에 명시적 전달
③route 403 / object 404 검증 ④생성·조회·수정·삭제·push·refresh 교차 테스트
⑤User @@unique([appId, id]) + 신규 Diary 테이블 복합 제약 ⑥Registry 기반 앱 조합 테스트

## 10. Diary 재개 게이트
다음을 모두 만족하면 Diary 제품 기능 개발을 재개할 수 있다.
- Phase 0부터 Phase 3까지 완료
- OAuth 식별자가 앱에 유일하게 매핑됨
- 신규 access JWT에 appId 포함 + refresh 회전 시 복원 동작
- AppScope 누락이 fail-closed로 차단됨
- 교차 route 403, 교차 객체 404
- body appId 위조·레거시 토큰 테스트 통과
- 신규 Diary 테이블의 앱 격리 제약 적용

기존 Worktimer 테이블 전체의 복합 FK 소급은 재개 조건에 포함하지 않는다.
단, Diary 배포 전 전체 회귀 테스트는 별도로 통과해야 한다.

## 11. 보류 항목
현재 적용하지 않음: RLS · 전면 tenant-scoped repository · 권한 전달용 ALS ·
Prisma 커스텀 린트 · dependency/import boundary 도구 · Registry JSON emit ·
앱별 schema/DB/서비스 분리.
보류 항목은 합의된 트리거 발생 시 재검토한다. 민감 데이터, 계약상 독립성,
트래픽 편중, 독립 매각 가능성이 있는 앱은 물리적 격리 후보로 승격한다.

## 12. 결정 기록
- 채택: A안 — 기존 refresh 유지, User 소속 기반 appId 복원
- 기각: B안 — refresh 전량 폐기 (게스트 계정 복구 불가 사유)
- 실행 소유권: 플랫폼 세션이 Registry·JWT·Guard·격리 테스트를 맡고,
  diary 세션은 WIP checkpoint 후 인계 (쌍방 동의)
- 남은 결정: **위승빈의 v1.2 최종 승인** → 승인 시 Phase 0 착수

## 같이 보면 좋은 문서
- `22-security-audit-fixes.md` — 이 플랜의 배경 (JWT appId 구멍·멀티세션 충돌 실사고)
- `14-sdui-app-factory-strategy.md` — 앱 팩토리 상위 전략
