# WorkTimer 멀티테넌트 전환 + NestJS 플랫폼 백엔드 — 설계 스펙 (M0+M1)

> 작성일: 2026-06-20
> 범위: M0(플랫폼 백엔드 토대) + M1(앱 멀티테넌시 전환) = "로그인 되는 멀티테넌트 앱 + 배포된 백엔드"
> 후속(M2~M5)은 부록의 로드맵 참고. 각 마일스톤은 독립 스펙→구현 사이클.

---

## 1. 목표와 비범위

### 1.1 이 스펙의 목표 (M0+M1)
- WorkTimer를 **사용자별 데이터가 격리되는 멀티테넌트 앱**으로 전환.
- 여러 모바일 앱을 받을 수 있는 **NestJS 플랫폼 백엔드**를 VPS에 배포.
- Apple/Google 소셜로그인 + 자체 JWT 인증.
- 앱이 Supabase 직접 접근을 끊고 **백엔드 API만** 호출.
- TestFlight/내부테스트로 실사용 가능한 상태까지.

### 1.2 비범위 (후속 마일스톤)
- 카테고리·목표·스트릭·포모도로 등 신규 기능 (M2)
- AI 코칭 (M3)
- 구독/결제 RevenueCat (M4)
- 스토어 정식 출시·심사 (M5)

단, **출시 필수요건 중 인증과 직결된 것**(계정 삭제 인앱 제공, Sign in with Apple)은 M0+M1에 포함.

---

## 2. 확정된 결정사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 앱 레포 구조 | worktimer-expo **standalone 유지** (모노레포 X) | 모바일 출시가 목표, 로직/디자인만 이식 |
| 백엔드 | **NestJS** (모듈러), 풀컨트롤 | 사용자 표준 스택, 멀티앱 재사용 |
| 프론트 | Next.js는 프론트 전용(현 단계 미사용) | |
| DB | **worktimer Supabase 유지**, NestJS가 service_role/직결 | 최소 변경, Supabase=관리형 Postgres |
| 인증 | **C-2: NestJS Passport 자체 OAuth** (Apple+Google) + 자체 JWT | 완전 독립, 외부 Auth 의존 0 |
| ORM | Prisma | 사용자 표준 |
| 호스팅 | 신규 Vultr VPS `45.77.135.225` (codeatlas-api, 2c/8GB, Tokyo) | 봇 박스(141)와 분리 |
| 도메인 | `api.codeatlas.kr` (.kr, 백엔드라 사용자 비노출) | |
| 멀티앱 격리 | `app_id` 컬럼 두되 단일값. 앱 간 SSO는 app#2 때 결정 | YAGNI |

---

## 3. 시스템 아키텍처

```
┌─────────────────┐
│  WorkTimer 앱    │  Expo (iOS+Android)
│  (Expo)         │  로그인(Apple/Google) · API클라이언트 · SecureStore 토큰
└────────┬────────┘
         │ HTTPS (Bearer JWT)
         ▼
┌──────────────────────────────────────────────┐
│  NestJS 플랫폼 API   (VPS 45.77.135.225)        │
│  api.codeatlas.kr  ← nginx + Let's Encrypt TLS │
│  ┌────────┬─────────┬──────────────────────┐  │
│  │ auth   │ core    │ worktimer            │  │
│  │ OAuth, │ JwtGuard│ sessions/stats/      │  │
│  │ JWT,   │ Tenant  │ settings             │  │
│  │ 계정삭제│ Prisma  │ (다음 앱은 옆에 모듈) │  │
│  └────────┴─────────┴──────────────────────┘  │
└────────┬───────────────────────────────────────┘
         │ service_role / pooler(6543) 직결
         ▼
┌──────────────────────┐
│ Supabase Postgres     │  (worktimer 프로젝트)
│ users, work_sessions… │
└──────────────────────┘
```

- 앱→DB 직접 접근 제거. 모든 시크릿은 서버에만.
- NestJS 내부 포트 3000, 외부는 nginx 443만 노출.
- 빌드는 로컬/CI, VPS엔 아티팩트(dist) 또는 Docker 이미지만 (VPS에서 tsc 안 돌림).

---

## 4. 인증 설계 (C-2)

### 4.1 흐름
- **Apple**: 앱 `expo-apple-authentication` → identity token → `POST /auth/apple` → NestJS가 Apple 공개키(JWKS)로 검증 → users 매칭/생성 → 자체 JWT 발급.
- **Google**: 앱 `expo-auth-session`(or Google SDK) → id_token → `POST /auth/google` → Google JWKS 검증 → 동일.
- **자체 JWT**: access(15분, 메모리), refresh(30일, DB 저장 + 회전). 앱은 둘 다 SecureStore.
- **갱신**: access 만료 시 `POST /auth/refresh` (refresh 회전 — 쓰면 폐기하고 새로 발급).
- **로그아웃**: `POST /auth/logout` (해당 refresh 폐기).
- **계정 삭제**: `DELETE /auth/account` → users.deleted_at 소프트삭제 + 데이터 하드삭제 정책(30일 유예 후 purge) + refresh 전부 폐기. **애플 정책상 인앱 필수** → 설정화면 버튼 연결.

### 4.2 권한 가드
- 보호 라우트 전부 `JwtAuthGuard` → `req.user.id` 주입.
- service_role이라 RLS는 안전망 아님 → **서비스 레이어가 유일한 격리 게이트**: 모든 쿼리에 `where user_id = req.user.id` 강제. Prisma 리포지토리 헬퍼로 user_id 누락 방지(테넌트 컨텍스트 미들웨어).

### 4.3 보안
- access token 짧게(15분), refresh 회전 + 해시 저장(`token_hash`, 평문 X).
- Apple/Google client secret·키는 VPS `.env`(op 주입).
- rate limit (`@nestjs/throttler`) 인증 엔드포인트에.

---

## 5. 데이터 모델

worktimer Supabase에 둠. 모든 사용자 데이터 테이블에 `user_id` + `app_id`.

### 5.1 신규 테이블

```
users
  id            uuid PK
  app_id        text  (단일값 'worktimer' for now)
  provider      text  ('apple' | 'google')
  provider_uid  text  (sub claim)
  email         text  nullable
  created_at    timestamptz
  deleted_at    timestamptz nullable
  UNIQUE(app_id, provider, provider_uid)

refresh_tokens
  id            uuid PK
  user_id       uuid FK
  token_hash    text
  expires_at    timestamptz
  revoked       boolean default false
  created_at    timestamptz
  INDEX(user_id)

user_settings
  user_id       uuid PK FK
  daily_goal_seconds int default 0
  theme         text default 'light'
  notif_*       (기존 알림 설정 이전)
```

### 5.2 기존 테이블 변경

```
work_sessions
  + user_id     uuid NOT NULL FK   ← 추가
  (기존: start_time, end_time, duration, date, created_at 유지)
  INDEX(user_id, date), INDEX(user_id, created_at)
```

마이그레이션은 안전 패턴(ADD COLUMN IF NOT EXISTS). 기존 work_sessions는 dev 데이터뿐.

### 5.3 기존 데이터 처리 (미결 — 4장 미결질문 참고)
- 옵션 A: 전부 삭제하고 빈 상태로 시작 (가장 깔끔)
- 옵션 B: 첫 로그인 계정에 귀속 (`UPDATE work_sessions SET user_id = <첫계정>`)

---

## 6. 백엔드 구조 (NestJS)

```
platform-api/                  (신규 레포)
├── src/
│   ├── auth/
│   │   ├── strategies/  apple.strategy.ts, google.strategy.ts, jwt.strategy.ts
│   │   ├── auth.controller.ts  (/auth/*)
│   │   ├── auth.service.ts
│   │   └── refresh-token.service.ts
│   ├── core/
│   │   ├── prisma.service.ts
│   │   ├── jwt-auth.guard.ts
│   │   ├── tenant.context.ts   (user_id 강제 헬퍼)
│   │   └── health.controller.ts (/health)
│   ├── worktimer/
│   │   ├── sessions.controller.ts / .service.ts
│   │   ├── settings.controller.ts / .service.ts
│   │   └── (stats는 M2)
│   └── main.ts
├── prisma/schema.prisma
├── .env  (op 주입, gitignore)
└── deploy/  (systemd unit, nginx conf, deploy script)
```

ORM: Prisma → Supabase Postgres **pooler(6543, transaction mode)** 연결.

---

## 7. API 엔드포인트 (M0+M1)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /auth/apple | Apple identity token 검증 → JWT |
| POST | /auth/google | Google id_token 검증 → JWT |
| POST | /auth/refresh | refresh 회전 |
| POST | /auth/logout | refresh 폐기 |
| DELETE | /auth/account | 계정 삭제 (애플 필수) |
| GET | /me | 내 프로필 |
| GET | /worktimer/sessions/today-total | 오늘 누적(초) |
| GET | /worktimer/sessions/ongoing | 진행중 세션(자정 넘김 대응) |
| GET | /worktimer/sessions?from&to | 기간 세션 목록 |
| POST | /worktimer/sessions | 시작 |
| PATCH | /worktimer/sessions/:id | 종료(서버서 duration 재계산) |
| DELETE | /worktimer/sessions/:id | 삭제 |
| POST | /worktimer/sessions/cleanup-orphaned | 고아 세션 정리 |
| GET/PATCH | /worktimer/settings | 사용자 설정 |

> 현재 `src/lib/session.ts`의 함수들(getTodayTotal, getOngoingSession, startSession, endSession, cleanupOrphanedSessions)을 그대로 API로 1:1 이전. **duration 타임스탬프 재계산·자정/고아 처리 로직은 서버로 이동**(클라 신뢰 X 원칙 유지).

---

## 8. 모바일 앱 변경 (Expo, M1)

### 8.1 신규
- **로그인 화면**: Apple 버튼(`expo-apple-authentication`) + Google 버튼. iOS는 Apple 필수.
- **온보딩/스플래시 분기**: 앱 시작 시 SecureStore 토큰 확인 → 있으면 메인, 없으면 로그인.
- **API 클라이언트**: fetch 래퍼 (baseURL=api.codeatlas.kr, Bearer 자동첨부, 401 시 refresh 후 1회 재시도).
- **토큰 저장**: `expo-secure-store` (access+refresh).
- **설정화면**: 로그아웃 + **계정삭제** 버튼(애플 필수).

### 8.2 전환
- `lib/supabase.ts` + `src/lib/session.ts`의 Supabase 직접호출 → **API 클라이언트 호출로 교체**. 화면(Timer/History/Stats/Settings) 로직은 데이터 소스만 바뀌고 거의 유지.
- 알림: Expo Push 토큰을 `/worktimer/push-tokens`에 등록(기본 골격, 실제 발송 로직은 후속).
- Live Activity: 유지(로컬 동작이라 영향 적음).

### 8.3 UI/UX (M1 최소분)
- 로그인/온보딩 디자인.
- 그 외 비주얼 개선(목표 링·다크모드 등)은 M2로.

---

## 9. 배포 / 인프라 (M0)

대상: `45.77.135.225` (codeatlas-api, Ubuntu 24.04, 2c/8GB)

1. **OS 하드닝**: ufw(22/80/443만), SSH 키 등록 + root 비번로그인 차단, fail2ban, 자동 보안업데이트.
2. **런타임**: Node 22(nvm or nodesource), pnpm.
3. **리버스 프록시**: nginx + Let's Encrypt(certbot) → `api.codeatlas.kr` → localhost:3000.
4. **DNS**: codeatlas.kr 존에 `api` A레코드 → 45.77.135.225 (사용자가 등록처에서 설정).
5. **프로세스**: systemd 유닛(`platform-api.service`) + 재시작정책. (pm2 대안 가능)
6. **배포 파이프라인**: 로컬/CI `nest build` → `dist` + node_modules(prod) rsync → systemd restart. `/health` 확인. (1차는 단순 재시작, 무중단은 후속)
7. **시크릿**: `.env` op 주입 (DB URL, JWT secret, Apple/Google 키). git 제외.
8. **백업**: Vultr Auto Backup 켜짐 + DB는 Supabase 백업.

---

## 10. 마일스톤 분해 (M0+M1 작업 순서 개요)

```
M0 백엔드 토대
  0-1 VPS 하드닝 + Node/nginx/certbot + DNS + TLS
  0-2 NestJS 부트스트랩 + Prisma + Supabase 연결 + /health
  0-3 DB 마이그레이션 (users, refresh_tokens, user_settings, work_sessions.user_id)
  0-4 auth 모듈 (Apple/Google 검증 + JWT + refresh회전 + 계정삭제)
  0-5 worktimer 모듈 (sessions/settings API) + 테넌트 격리
  0-6 systemd 배포 + 스모크 테스트

M1 앱 전환
  1-1 API 클라이언트 + SecureStore 토큰
  1-2 로그인/온보딩 화면 (Apple/Google)
  1-3 session.ts → API 전환, 화면 연결
  1-4 설정: 로그아웃 + 계정삭제
  1-5 데이터 격리 E2E 검증 (계정A/B 분리 확인)
  1-6 TestFlight/내부테스트 빌드
```

> 상세 단계·테스트는 writing-plans에서 구현계획으로 전개.

---

## 11. 미결 질문 (사용자 확인 필요)

1. **기존 work_sessions dev 데이터** — 삭제(A) vs 첫 계정 귀속(B)? (기본값 A 권장)
2. **api.codeatlas.kr DNS** — codeatlas.kr 등록/네임서버가 어디야? (가비아/CF 등) A레코드 직접 넣을지 내가 안내할지.
3. **Google OAuth** — Google Cloud 프로젝트 OAuth 클라이언트(iOS/Android/web) 발급 필요. 기존 GCP 프로젝트 쓸지 신규.
4. **Apple** — Apple Developer에서 Sign in with Apple용 Service ID + Key 발급 필요(기존 `com.gawall.worktimer` 번들과 연결). 진행 시 함께.
5. **앱 번들ID 유지** — 현재 `com.gawall.worktimer` 그대로 출시? (Apple 로그인·푸시 설정이 여기 묶임)

---

## 부록 A. 전체 로드맵 (M2~M5)

```
M2 기능이식+UIUX   카테고리·일일목표·스트릭·포모도로·세션메모·다크모드·CSV
M3 AI 코칭         NestJS Claude 프록시, 리포트 캐싱, 엔타이틀먼트
M4 구독            RevenueCat IAP, 영수증검증/웹훅, 프리미엄 게이팅
M5 스토어 출시      개인정보처리방침·ATS·Apple/Google 콘솔·EAS submit·심사
```

각 마일스톤은 본 스펙과 동일하게 별도 설계→구현계획→구현 사이클로 진행.
