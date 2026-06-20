# codeatlas 플랫폼 백엔드 (NestJS API)

**최종 갱신**: 2026-06-20

worktimer-expo의 멀티테넌트 백엔드 = 별도 레포 `codeatlas-platform-api`. 라이브 배포됨.
펴볼 때: API 엔드포인트·인증·배포·DB 스키마 손볼 때, 다른 앱 백엔드로 확장할 때.

## 정체 / 위치

- 레포: `github.com/wjb127/codeatlas-platform-api` (private), 로컬 `~/Project/codeatlas-platform-api`
- 라이브: **https://api.codeatlas.kr** (VPS 45.77.135.225, Tokyo, Ubuntu 24.04, 2c/8GB)
- 목적: 여러 모바일 앱 공용 백엔드. 첫 입주자 = WorkTimer.
- 스택: **NestJS 11 + Prisma 6 + Supabase Postgres**. 테스트 Jest+Supertest. (★ pnpm)

## 구조 (모듈러)

```
src/
  core/      PrismaService, JwtAuthGuard, HealthController (/health) — 앱 무관 공용
  auth/      자체 JWT(Passport). issue/refresh회전/me. ★APP_ID='worktimer' 하드코딩(멀티앱시 리팩터)
  worktimer/ 세션·설정 API. 모든 쿼리 user_id 강제(테넌트 격리)
prisma/schema.prisma   schemas=["codeatlas"] + 각 모델 @@schema("codeatlas")
deploy/    codeatlas-api.service(systemd), nginx conf, deploy.sh
```

## 인증 (C-2: 자체 OAuth, 단 OAuth 입구는 미구현)

- 자체 JWT: access 15분 + refresh 30일(회전 + sha256 해시저장).
- 구현됨: `issueForProvider`(user upsert+토큰), `rotateRefresh`, `logout`, JwtStrategy, JwtAuthGuard.
- 엔드포인트: `POST /auth/refresh`, `/auth/logout`, `GET /me`.
- **미구현 = 로그인 입구**: `/auth/google`(D), `/auth/apple`+계정삭제(E) → 현재 404. 콘솔 발급 후 작업.
- 즉 인증 인프라는 완성·동작하나, 외부에서 토큰 받을 소셜로그인 입구가 없음.

## API 엔드포인트 (현재)

| 메서드 | 경로 | 상태 |
|---|---|---|
| GET | /health | 200 |
| GET | /me | JWT 필요(401 if없음) |
| POST | /auth/refresh, /auth/logout | 동작 |
| POST | /auth/google, /auth/apple | **404 미구현(D/E)** |
| POST/GET | /worktimer/sessions (start/ongoing/today-total/list) | JWT 보호 |
| PATCH/DELETE | /worktimer/sessions/:id (end/삭제) | JWT 보호 |
| POST | /worktimer/sessions/cleanup-orphaned | JWT 보호 |
| GET/PATCH | /worktimer/settings | JWT 보호 |

세션 로직은 worktimer-expo `src/lib/session.ts`를 서버로 1:1 이전. duration 서버서 재계산, 자정/고아 처리 동일.

## DB — codeatlas 스키마 격리 (★중요)

- 운영 DB = **공유 Supabase 프로젝트** `bzzjkcrbwwrqlumxigag`("supabase-auth-app"). 200+ 테이블(모든 km_* 크몽 + work-timer 웹 등). `public.work_sessions`(라이브 1453행)·`public.users` 이미 존재.
- 그래서 신규 테이블 전부 **`codeatlas` 스키마**에 격리 (public 절대 미사용 → 충돌 방지).
- 테이블: `codeatlas.users`(app_id+provider+provider_uid 유니크), `refresh_tokens`, `user_settings`, `work_sessions`(user_id+app_id).
- 적용: **Supabase MCP `apply_migration`**으로 codeatlas 스키마 생성(연결문자열 없이). 스키마 변경은 앞으로도 MCP/SQL로 codeatlas에만. `prisma migrate deploy` 안 씀(공유 DB 보호).
- 접속: 전용 role **`codeatlas_app`**(codeatlas 스키마만 접근, 최소권한) + 세션풀러(5432). postgres 메인 비번 안 건드림.

## 배포 / 운영

- nginx 리버스프록시(127.0.0.1:3000) + Let's Encrypt TLS(api.codeatlas.kr, ~2026-09 만료, 자동갱신) + systemd `codeatlas-api`(Restart=always).
- 하드닝: ufw(22/80/443), fail2ban, SSH 키 인증(로컬 키 등록됨). root 비번로그인은 아직 살림.
- 배포: 로컬 `pnpm build` → `deploy/deploy.sh`(rsync dist + pnpm install --prod + `pnpm dlx prisma generate` + systemctl restart). **VPS에서 tsc 안 돌림.**
- ★ 함정: prisma는 devDep이라 `--prod`에 빠짐 → `pnpm dlx prisma generate` 필수. pnpm11은 package.json `onlyBuiltDependencies` 무시.

## 현재 상태 (M0 완료)

- ✅ /health, 인증코어, 세션/설정 API, 테넌트 격리, codeatlas 격리, VPS 배포·TLS. 테스트 16+ PASS.
- ⬜ D(Google)·E(Apple+계정삭제) OAuth, M1(앱 전환).

## 멀티앱 확장

- 토대 OK: core/auth 공용, app_id 디스크리미네이터, 공용 인프라.
- 2번째 앱 전 필요한 리팩터: auth의 `APP_ID='worktimer'` 하드코딩 → app-aware(app_id 파라미터) + 앱별 OAuth 설정 레지스트리.
- 앱 추가 레시피: `src/<app>/` 모듈 + codeatlas에 앱 테이블 + 라우트 prefix + deploy 재실행.

## 같이 보면 좋은 문서
- `05-architecture-roadmap.md` — 전체 시스템 아키텍처·로드맵·스펙 위치
- `.private/01-codeatlas-infra.md` — op 시크릿 참조·접속 정보 (git 제외)
