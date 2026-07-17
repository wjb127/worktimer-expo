# codeatlas 플랫폼 백엔드 (NestJS API)

**최종 갱신**: 2026-07-16

worktimer-expo의 멀티테넌트 백엔드 = 별도 레포 `codeatlas-platform-api`. 라이브 배포됨.
펴볼 때: API 엔드포인트·인증·배포·DB 스키마 손볼 때, 다른 앱 백엔드로 확장할 때.

## 정체 / 위치

- 레포: `github.com/wjb127/codeatlas-platform-api` (private), 로컬 `~/Project/codeatlas-platform-api`
- 라이브: **https://api.codeatlas.kr** (VPS 45.77.135.225, Tokyo, Ubuntu 24.04, 2c/8GB)
- 목적: 여러 모바일 앱 공용 백엔드. 첫 입주자 = WorkTimer.
- 스택: **NestJS 11 + Prisma 6 + VPS 로컬 PostgreSQL 16**. 테스트 Jest+Supertest. (★ pnpm)

## 구조 (모듈러)

```
src/
  core/      PrismaService, JwtAuthGuard, HealthController (/health) — 앱 무관 공용
  auth/      자체 JWT(Passport). issue/refresh회전/me. ★APP_ID='worktimer' 하드코딩(멀티앱시 리팩터)
  worktimer/ 세션·설정 API. 모든 쿼리 user_id 강제(테넌트 격리)
prisma/schema.prisma   schemas=["codeatlas"] + 각 모델 @@schema("codeatlas")
deploy/    codeatlas-api.service(systemd), nginx conf, deploy.sh
```

## 인증 (C-2: 자체 OAuth — D/E 라이브)

- 자체 JWT: access 15분 + refresh 30일(회전 + sha256 해시저장).
- 구현됨: `issueForProvider`(user upsert+토큰), `rotateRefresh`, `logout`, JwtStrategy, JwtAuthGuard.
- **OAuth 입구 라이브**: `/auth/google`(D), `/auth/apple`(E) — id_token을 JWKS로 검증(jose v5) → 우리 JWT. `oidc-verifier.ts` 공통.
- `/auth/account`(DELETE, JWT보호) 계정삭제 cascade.
- 엔드포인트: `POST /auth/google /auth/apple /auth/refresh /auth/logout`, `GET /me`, `DELETE /auth/account`.
- 콘솔: Google Web+iOS client ID 설정됨(env). Apple App ID(Sign in with Apple)+bundle/service ID env.
- ⬜ 남은 것: Google Android client(SHA-1), Apple Service ID/.p8 키(Android·계정삭제 revoke), 실제 로그인 e2e는 M1(앱 버튼).

## API 엔드포인트 (현재)

| 메서드 | 경로 | 상태 |
|---|---|---|
| GET | /health | 200 |
| GET | /me | JWT 필요(401 if없음) |
| POST | /auth/refresh, /auth/logout | 동작 |
| POST | /auth/google, /auth/apple | **라이브 (id_token 검증→JWT)** |
| DELETE | /auth/account | JWT 보호, cascade 삭제 |
| PATCH | /worktimer/sessions/:id/edit | 수동편집(start/end→duration재계산, CalendarView) |
| POST/GET | /worktimer/sessions (start/ongoing/today-total/list) | JWT 보호 |
| PATCH/DELETE | /worktimer/sessions/:id (end/삭제) | JWT 보호 |
| POST | /worktimer/sessions/cleanup-orphaned | JWT 보호 |
| GET/PATCH | /worktimer/settings | JWT 보호 |

세션 로직은 worktimer-expo `src/lib/session.ts`를 서버로 1:1 이전. duration 서버서 재계산, 자정/고아 처리 동일.

## DB — VPS PostgreSQL + codeatlas 스키마 격리 (★중요)

- 운영 DB = VPS PostgreSQL 16.14, `127.0.0.1:5432`, DB/user/schema 모두 `codeatlas`. 외부 포트 미개방.
- 2026-07-16 공유 Supabase에서 이관 완료. 신규 테이블은 계속 **`codeatlas` 스키마**에 둔다.
- 테이블: `codeatlas.users`(app_id+provider+provider_uid 유니크), `refresh_tokens`, `user_settings`, `work_sessions`(user_id+app_id).
- 스키마 변경: `deploy/deploy.sh`에서 `prisma migrate deploy` 자동 실행. 구 공유 DB 보호 정책은 폐기됨.
- 콘솔: `ssh root@45.77.135.225` → `sudo -u postgres psql codeatlas`. 자격증명 상세는 private 인프라 노트.
- 백업: 매일 KST 04:10, VPS 로컬 30일 + Cloudflare R2 90일, 복원 리허설 완료.

## 배포 / 운영

- Cloudflare 프록시 → nginx → Node :3000 + Let's Encrypt DNS-01 자동갱신 + systemd `codeatlas-api`(Restart=always).
- 하드닝: 80/443은 Cloudflare 대역만 UFW 허용, fail2ban, SSH 키 전용, systemd 비root `codeatlas` + sandboxing.
- 배포: 로컬 `pnpm build` → `deploy/deploy.sh`(rsync dist + pnpm install --prod + `pnpm dlx prisma generate` + systemctl restart). **VPS에서 tsc 안 돌림.**
- ★ 함정: prisma는 devDep이라 `--prod`에 빠짐 → `pnpm dlx prisma generate` 필수. pnpm11은 package.json `onlyBuiltDependencies` 무시.

## 현재 상태 (2026-07-16)

- ✅ `/health`, Google/Apple 인증, JWT 회전, 세션/할일/설정/통계, 계정삭제, 배너 SDUI 라이브.
- ✅ 모바일 API 전환·실기기 E2E·Google production OAuth 완료.
- ✅ VPS PostgreSQL 16 이관, `prisma migrate deploy`, 로컬+R2 백업, 어드민 VPS 이사 완료.
- ✅ RevenueCat 구독 DB/웹훅과 AI 프록시가 같은 공용 백엔드에 추가됨.
- ⚠️ 두 번째 앱 전에는 `APP_ID='worktimer'` 하드코딩과 앱 식별 신뢰경계를 먼저 해결한다.

## 멀티앱 확장

- 토대 OK: core/auth 공용, app_id 디스크리미네이터, 공용 인프라.
- 2번째 앱 전 필수 게이트: auth의 `APP_ID='worktimer'` 하드코딩 제거 → 신뢰 가능한 빌드타임 앱 식별 + 앱별 OAuth 설정 레지스트리. 클라이언트가 보낸 임의 `appId`만 신뢰하면 안 됨.
- 앱 추가 레시피: `src/<app>/` 모듈 + codeatlas에 앱 테이블 + 라우트 prefix + deploy 재실행.

## 같이 보면 좋은 문서
- `05-architecture-roadmap.md` — 전체 시스템 아키텍처·로드맵·스펙 위치
- `.private/01-codeatlas-infra.md` — op 시크릿 참조·접속 정보 (git 제외)
