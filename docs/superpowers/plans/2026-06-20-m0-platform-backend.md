# M0 — 플랫폼 백엔드 토대 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apple/Google 소셜로그인 + 자체 JWT 인증과 WorkTimer 세션 API를 갖춘 NestJS 멀티테넌트 백엔드를 `api.codeatlas.kr`(VPS 45.77.135.225)에 HTTPS로 배포한다.

**Architecture:** NestJS 모듈러(auth/core/worktimer) + Prisma → Supabase Postgres(service_role/direct). 앱은 백엔드 API만 호출. 인증은 OAuth identity token을 서버에서 JWKS 검증 후 자체 JWT(access 15m + refresh 30d 회전) 발급. service_role이라 RLS 미사용 → 서비스 레이어가 `user_id` 격리를 강제. nginx + Let's Encrypt로 TLS, systemd로 프로세스 관리, 빌드는 로컬에서 후 아티팩트 배포.

**Tech Stack:** NestJS 11, TypeScript, Prisma, Passport(JWT), jose(JWKS 검증), Jest + Supertest, PostgreSQL(Supabase), nginx, certbot, systemd, pnpm.

**Reference spec:** `docs/superpowers/specs/2026-06-20-worktimer-multitenancy-platform-design.md`

---

## 확정 식별자 (계획 전체에서 사용)

| 항목 | 값 |
|---|---|
| 번들ID | `kr.codeatlas.worktimer` |
| Apple Team ID | `9Q26686S8R` |
| API 도메인 | `api.codeatlas.kr` |
| API VPS | `45.77.135.225` (root, op: `op://2mm2bwf2dqm47mpuerncpebpea/vat63pdwbf5o22467x6jovh4qm/password`) |
| GCP 프로젝트 | `codeatlas` (신규) |
| 백엔드 레포 | `~/Project/codeatlas-platform-api` (신규, GitHub 별도) |
| DB | worktimer Supabase (기존) |

---

## 테스트 전략

- **단위/통합 테스트는 로컬 Postgres**(테스트 격리, Supabase 운영 데이터 오염 방지). Docker 컨테이너 사용.
  - `DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/codeatlas_test"`
- **운영 DB(Supabase)는 마이그레이션 적용 + 배포 후 스모크 테스트에만** 사용.
- 프레임워크: Jest(`*.spec.ts` 단위) + Supertest(`test/*.e2e-spec.ts` 통합).
- OAuth 검증 테스트는 **테스트용 RSA 키쌍으로 가짜 identity token을 서명**하고, JWKS fetch를 모킹해 그 공개키를 반환 → 외부 Apple/Google 호출 없이 검증 로직 테스트.

---

## 사전 준비 (수동, op 시크릿) — Task 0

> 사용자(콘솔 접근 필요)가 수행. Claude는 가이드 제공 + 값 수령(공개값) / op 참조(시크릿).

### Task 0: 외부 자격증명 발급

**0-1. 로컬 Postgres(테스트용) 기동**
- [ ] Docker로 테스트 DB 컨테이너 실행:
```bash
docker run -d --name codeatlas-test-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=codeatlas_test -p 5433:5432 postgres:16
```
- [ ] 확인: `docker ps | grep codeatlas-test-pg` → Up

**0-2. Supabase 연결 정보 확보**
- [ ] Supabase 대시보드 → worktimer 프로젝트 → Settings → Database → Connection string(URI, **Transaction pooler 6543**) 복사.
- [ ] op에 저장(사용자 직접): `codeatlas-api/database-url` (pooler URI). Claude엔 `op://...` 참조만 전달.

**0-3. Google OAuth (신규 프로젝트 `codeatlas`)** — Claude가 클릭 가이드를 별도 제공. 산출물:
- [ ] Web client ID + secret (백엔드 검증/Android web flow용)
- [ ] iOS client ID, Android client ID (공개값)
- [ ] secret은 op: `codeatlas-api/google-client-secret`. 공개 client ID들은 평문 전달 OK.

**0-4. Apple Sign In** — Claude가 클릭 가이드 제공. 산출물:
- [ ] App ID `kr.codeatlas.worktimer` + Sign in with Apple capability
- [ ] Services ID `kr.codeatlas.worktimer.signin` (Android/web flow용)
- [ ] Key(.p8) for Sign in with Apple + Key ID
- [ ] .p8는 op: `codeatlas-api/apple-signin-key`(파일), Key ID/Team ID는 평문 OK.

**0-5. 가비아 DNS** (완료됨)
- [x] `api` A레코드 → 45.77.135.225

> Task 0의 OAuth 발급(0-3, 0-4)은 **Phase D/E 시작 전까지만** 되면 됨. Phase A~C는 발급 없이 진행 가능.

---

## Phase A — NestJS 프로젝트 부트스트랩

### Task A1: 레포 생성 + NestJS 스캐폴드

**Files:**
- Create: `~/Project/codeatlas-platform-api/` (신규 NestJS 프로젝트)

- [ ] **Step 1: NestJS 프로젝트 생성**
```bash
cd ~/Project
pnpm dlx @nestjs/cli@latest new codeatlas-platform-api --package-manager pnpm --skip-git
cd codeatlas-platform-api
git init
```

- [ ] **Step 2: 핵심 의존성 설치**
```bash
pnpm add @nestjs/config @nestjs/passport passport passport-jwt @nestjs/jwt \
  @prisma/client jose @nestjs/throttler
pnpm add -D prisma @types/passport-jwt supertest @types/supertest
```

- [ ] **Step 3: .gitignore에 시크릿/빌드 제외 확인**
```bash
printf '\n.env\n.env.*\ndist\nnode_modules\n*.p8\n' >> .gitignore
```

- [ ] **Step 4: 빌드 확인**
```bash
pnpm build
```
Expected: `dist/` 생성, 에러 없음

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "chore: NestJS 플랫폼 API 스캐폴드 + 핵심 의존성"
```

### Task A2: 환경설정 + /health 엔드포인트 (TDD)

**Files:**
- Create: `src/core/health.controller.ts`, `src/core/core.module.ts`
- Modify: `src/app.module.ts`
- Test: `test/health.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**
```typescript
// test/health.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:e2e -- health`
Expected: FAIL (404, /health 없음)

- [ ] **Step 3: Implement health controller + core module**
```typescript
// src/core/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
```
```typescript
// src/core/core.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class CoreModule {}
```
```typescript
// src/app.module.ts — ConfigModule 전역 + CoreModule 등록
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CoreModule],
})
export class AppModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:e2e -- health`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: /health 엔드포인트 + ConfigModule 전역 설정"
```

---

## Phase B — Prisma + DB 스키마

### Task B1: Prisma 초기화 + 스키마 정의

**Files:**
- Create: `prisma/schema.prisma`, `src/core/prisma.service.ts`
- Create: `.env`(로컬, gitignore), `.env.example`

- [ ] **Step 1: Prisma init**
```bash
pnpm prisma init --datasource-provider postgresql
```

- [ ] **Step 2: 스키마 작성**
```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id          String   @id @default(uuid())
  appId       String   @map("app_id")
  provider    String   // 'apple' | 'google'
  providerUid String   @map("provider_uid")
  email       String?
  createdAt   DateTime @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")
  sessions      WorkSession[]
  refreshTokens RefreshToken[]
  settings      UserSettings?
  @@unique([appId, provider, providerUid])
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @map("token_hash")
  expiresAt DateTime @map("expires_at")
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("refresh_tokens")
}

model UserSettings {
  userId           String  @id @map("user_id")
  dailyGoalSeconds Int     @default(0) @map("daily_goal_seconds")
  theme            String  @default("light")
  user             User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("user_settings")
}

model WorkSession {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  appId     String    @default("worktimer") @map("app_id")
  startTime DateTime  @map("start_time")
  endTime   DateTime? @map("end_time")
  duration  Int       @default(0)
  date      String    // YYYY-MM-DD (로컬 타임존)
  createdAt DateTime  @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, date])
  @@index([userId, createdAt])
  @@map("work_sessions")
}
```

- [ ] **Step 3: PrismaService 작성**
```typescript
// src/core/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}
```

- [ ] **Step 4: CoreModule에 PrismaService 등록 + export**
```typescript
// src/core/core.module.ts
import { Module, Global } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CoreModule {}
```

- [ ] **Step 5: .env.example 작성**
```bash
# .env.example
DATABASE_URL=                 # Supabase pooler URI (op: codeatlas-api/database-url)
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/codeatlas_test
JWT_SECRET=                   # openssl rand -hex 32
GOOGLE_WEB_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
APPLE_TEAM_ID=9Q26686S8R
APPLE_BUNDLE_ID=kr.codeatlas.worktimer
APPLE_SERVICE_ID=kr.codeatlas.worktimer.signin
APPLE_KEY_ID=
```

- [ ] **Step 6: 로컬 테스트 DB에 스키마 push + Commit**
```bash
DATABASE_URL="$DATABASE_URL_TEST" pnpm prisma migrate dev --name init
git add -A && git commit -m "feat: Prisma 스키마(users/refresh_tokens/user_settings/work_sessions) + PrismaService"
```
Expected: `prisma/migrations/` 생성

### Task B2: 운영 DB(Supabase) 마이그레이션 적용

**Files:** (DB 작업, 코드 변경 없음)

> ★ 정정(실제 수행): 공유 Supabase에 `public.work_sessions`(라이브 1453행)·`public.users`(타 서비스)가 이미 존재 → DROP 금지. **codeatlas 스키마로 격리 생성**으로 변경. **완료됨.**

- [x] **Step 1: Prisma multiSchema 전환** — `schemas=["codeatlas"]` + 각 모델 `@@schema("codeatlas")`. 마이그레이션 SQL이 `CREATE SCHEMA codeatlas` + codeatlas 한정 테이블 생성.

- [x] **Step 2: Supabase MCP로 codeatlas 스키마 적용** — `apply_migration(project_id=bzzjkcrbwwrqlumxigag, codeatlas_platform_init)`. public 무영향. DATABASE_URL 연결문자열 불필요(MCP가 적용).

- [x] **Step 3: 검증** — `list_tables(schemas=["codeatlas"])`로 4테이블·PK·FK·인덱스 확인. public 200+ 테이블 그대로.

> 운영 런타임 연결: 배포 시 DATABASE_URL(Supabase pooler URI)만 있으면 됨. Prisma가 codeatlas 스키마로 쿼리(`schemas` 설정). `prisma migrate deploy`는 공유 DB라 사용 안 함 — 스키마 변경은 MCP/SQL로 codeatlas에만.

---

## Phase C — 인증 코어 (JWT + Users + Refresh)

### Task C1: AuthService — 사용자 upsert + JWT 발급 (TDD)

**Files:**
- Create: `src/auth/auth.service.ts`, `src/auth/auth.module.ts`, `src/auth/dto.ts`
- Test: `src/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the failing test**
```typescript
// src/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../core/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [AuthService, PrismaService],
    }).compile();
    service = mod.get(AuthService);
    prisma = mod.get(PrismaService);
  });
  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });
  afterAll(async () => prisma.$disconnect());

  it('첫 로그인 시 user를 생성하고 access+refresh를 발급한다', async () => {
    const r = await service.issueForProvider({
      provider: 'google', providerUid: 'g-123', email: 'a@b.com',
    });
    expect(r.accessToken).toBeDefined();
    expect(r.refreshToken).toBeDefined();
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].provider).toBe('google');
  });

  it('같은 provider_uid 재로그인 시 user를 중복 생성하지 않는다', async () => {
    await service.issueForProvider({ provider: 'google', providerUid: 'g-123' });
    await service.issueForProvider({ provider: 'google', providerUid: 'g-123' });
    expect(await prisma.user.count()).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- auth.service`
Expected: FAIL (AuthService 없음)

- [ ] **Step 3: Implement AuthService**
```typescript
// src/auth/dto.ts
export interface ProviderIdentity {
  provider: 'apple' | 'google';
  providerUid: string;
  email?: string;
}
export interface TokenPair { accessToken: string; refreshToken: string; }
```
```typescript
// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../core/prisma.service';
import { ProviderIdentity, TokenPair } from './dto';

const APP_ID = 'worktimer';
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async issueForProvider(id: ProviderIdentity): Promise<TokenPair> {
    const user = await this.prisma.user.upsert({
      where: { appId_provider_providerUid: { appId: APP_ID, provider: id.provider, providerUid: id.providerUid } },
      update: { email: id.email ?? undefined, deletedAt: null },
      create: { appId: APP_ID, provider: id.provider, providerUid: id.providerUid, email: id.email },
    });
    return this.issueTokens(user.id);
  }

  async issueTokens(userId: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: userId }, { expiresIn: ACCESS_TTL });
    const raw = randomBytes(40).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    return { accessToken, refreshToken: raw };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- auth.service`
Expected: PASS (2 passing)

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: AuthService — provider 로그인 user upsert + JWT 발급 (TDD)"
```

### Task C2: Refresh 회전 + 로그아웃 (TDD)

**Files:**
- Modify: `src/auth/auth.service.ts`
- Test: `src/auth/auth.service.spec.ts` (추가)

- [ ] **Step 1: Write the failing test**
```typescript
  it('refresh 토큰을 회전한다(쓰면 폐기 + 새로 발급)', async () => {
    const { refreshToken } = await service.issueForProvider({ provider: 'google', providerUid: 'g-1' });
    const rotated = await service.rotateRefresh(refreshToken);
    expect(rotated.refreshToken).not.toBe(refreshToken);
    // 같은 토큰 재사용은 거부
    await expect(service.rotateRefresh(refreshToken)).rejects.toThrow();
  });

  it('logout은 해당 refresh를 폐기한다', async () => {
    const { refreshToken } = await service.issueForProvider({ provider: 'google', providerUid: 'g-2' });
    await service.logout(refreshToken);
    await expect(service.rotateRefresh(refreshToken)).rejects.toThrow();
  });
```

- [ ] **Step 2: Run test** — Run: `pnpm test -- auth.service` → FAIL (rotateRefresh/logout 없음)

- [ ] **Step 3: Implement rotate + logout**
```typescript
// auth.service.ts에 추가
import { UnauthorizedException } from '@nestjs/common';

  private hash(raw: string) { return createHash('sha256').update(raw).digest('hex'); }

  async rotateRefresh(raw: string): Promise<TokenPair> {
    const tokenHash = this.hash(raw);
    const rec = await this.prisma.refreshToken.findFirst({ where: { tokenHash, revoked: false } });
    if (!rec || rec.expiresAt < new Date()) throw new UnauthorizedException('invalid refresh');
    await this.prisma.refreshToken.update({ where: { id: rec.id }, data: { revoked: true } });
    return this.issueTokens(rec.userId);
  }

  async logout(raw: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.hash(raw) }, data: { revoked: true } });
  }
```

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: refresh 토큰 회전 + 로그아웃 (TDD)"
```

### Task C3: JwtStrategy + JwtAuthGuard + /me (TDD)

**Files:**
- Create: `src/auth/jwt.strategy.ts`, `src/core/jwt-auth.guard.ts`, `src/auth/me.controller.ts`
- Modify: `src/auth/auth.module.ts`
- Test: `test/me.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**
```typescript
// test/me.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

describe('Me (e2e)', () => {
  let app: INestApplication; let token: string;
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); await app.init();
    const auth = app.get(AuthService);
    token = (await auth.issueForProvider({ provider: 'google', providerUid: 'me-1', email: 'm@e.com' })).accessToken;
  });
  afterAll(async () => app.close());

  it('GET /me는 토큰 없으면 401', async () => {
    expect((await request(app.getHttpServer()).get('/me')).status).toBe(401);
  });
  it('GET /me는 토큰 있으면 내 프로필', async () => {
    const res = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('m@e.com');
  });
});
```

- [ ] **Step 2: Run test** → FAIL (/me 없음, guard 없음)

- [ ] **Step 3: Implement strategy + guard + controller + module**
```typescript
// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService, private prisma: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: cfg.get('JWT_SECRET') });
  }
  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findFirst({ where: { id: payload.sub, deletedAt: null } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email };
  }
}
```
```typescript
// src/core/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```
```typescript
// src/auth/me.controller.ts
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../core/jwt-auth.guard';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  @Get()
  me(@Req() req: any) { return req.user; }
}
```
```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { MeController } from './me.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({ secret: cfg.get('JWT_SECRET') }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [MeController],
  exports: [AuthService],
})
export class AuthModule {}
```
```typescript
// src/app.module.ts — AuthModule 등록 추가
// imports: [..., AuthModule]
```

- [ ] **Step 4: Run test** → PASS (2 passing)

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: JwtStrategy + JwtAuthGuard + /me (TDD)"
```

---

## Phase D — Google OAuth

### Task D1: OAuth identity token 검증기 (TDD, JWKS 모킹)

**Files:**
- Create: `src/auth/oidc-verifier.ts`
- Test: `src/auth/oidc-verifier.spec.ts`

> Google/Apple 둘 다 OIDC id_token(JWT)을 JWKS로 검증하는 공통 로직. `jose` 사용. 테스트는 로컬 RSA 키로 토큰 서명 + JWKS를 in-memory로 주입.

- [ ] **Step 1: Write the failing test**
```typescript
// src/auth/oidc-verifier.spec.ts
import { generateKeyPair, exportJWK, SignJWT, importJWK } from 'jose';
import { verifyOidcToken } from './oidc-verifier';

describe('verifyOidcToken', () => {
  it('유효한 id_token에서 sub/email을 검증·추출한다', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'test-kid'; jwk.alg = 'RS256';
    const token = await new SignJWT({ email: 'x@y.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
      .setIssuer('https://accounts.google.com').setAudience('aud-1')
      .setSubject('sub-99').setExpirationTime('5m').sign(privateKey);

    const result = await verifyOidcToken(token, {
      issuer: 'https://accounts.google.com', audience: 'aud-1',
      jwks: async () => importJWK(jwk, 'RS256'),
    });
    expect(result.sub).toBe('sub-99');
    expect(result.email).toBe('x@y.com');
  });

  it('audience 불일치는 거부한다', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'k'; jwk.alg = 'RS256';
    const token = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k' })
      .setIssuer('https://accounts.google.com').setAudience('wrong')
      .setSubject('s').setExpirationTime('5m').sign(privateKey);
    await expect(verifyOidcToken(token, {
      issuer: 'https://accounts.google.com', audience: 'aud-1',
      jwks: async () => importJWK(jwk, 'RS256'),
    })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test** → FAIL (verifyOidcToken 없음)

- [ ] **Step 3: Implement verifier**
```typescript
// src/auth/oidc-verifier.ts
import { jwtVerify, createRemoteJWKSet, KeyLike } from 'jose';

export interface OidcResult { sub: string; email?: string; }
export interface VerifyOpts {
  issuer: string | string[];
  audience: string | string[];
  jwks?: () => Promise<KeyLike | Uint8Array>; // 테스트 주입용
  jwksUri?: string;                            // 운영용
}

export async function verifyOidcToken(token: string, opts: VerifyOpts): Promise<OidcResult> {
  const keyResolver = opts.jwks
    ? async () => opts.jwks!()
    : createRemoteJWKSet(new URL(opts.jwksUri!));
  const { payload } = await jwtVerify(token, keyResolver as any, {
    issuer: opts.issuer, audience: opts.audience,
  });
  return { sub: payload.sub as string, email: payload.email as string | undefined };
}
```

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: OIDC id_token JWKS 검증기 (TDD)"
```

### Task D2: POST /auth/google + /auth/refresh + /auth/logout (TDD)

**Files:**
- Create: `src/auth/auth.controller.ts`
- Modify: `src/auth/auth.service.ts` (loginWithGoogle), `src/auth/auth.module.ts`
- Test: `test/auth-google.e2e-spec.ts`

- [ ] **Step 1: Write the failing test** (verifier를 google id_token 모킹)
```typescript
// test/auth-google.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, exportJWK, SignJWT, importJWK } from 'jose';
import { AppModule } from '../src/app.module';
import * as verifier from '../src/auth/oidc-verifier';

describe('Auth Google (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    process.env.GOOGLE_WEB_CLIENT_ID = 'aud-web';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); await app.init();
  });
  afterAll(async () => app.close());

  it('유효한 google id_token으로 JWT를 발급한다', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'g'; jwk.alg = 'RS256';
    jest.spyOn(verifier, 'verifyOidcToken').mockResolvedValue({ sub: 'goog-1', email: 'g@x.com' });

    const idToken = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'g' })
      .setIssuer('https://accounts.google.com').setAudience('aud-web')
      .setSubject('goog-1').setExpirationTime('5m').sign(privateKey);

    const res = await request(app.getHttpServer()).post('/auth/google').send({ idToken });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test** → FAIL (/auth/google 없음)

- [ ] **Step 3: Implement loginWithGoogle + controller**
```typescript
// auth.service.ts에 추가
import { ConfigService } from '@nestjs/config';
import { verifyOidcToken } from './oidc-verifier';
// 생성자에 private cfg: ConfigService 추가

  async loginWithGoogle(idToken: string): Promise<TokenPair> {
    const audiences = [
      this.cfg.get('GOOGLE_WEB_CLIENT_ID'),
      this.cfg.get('GOOGLE_IOS_CLIENT_ID'),
      this.cfg.get('GOOGLE_ANDROID_CLIENT_ID'),
    ].filter(Boolean) as string[];
    const r = await verifyOidcToken(idToken, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: audiences,
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    });
    return this.issueForProvider({ provider: 'google', providerUid: r.sub, email: r.email });
  }
```
```typescript
// src/auth/auth.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('google')
  google(@Body('idToken') idToken: string) { return this.auth.loginWithGoogle(idToken); }
  @Post('refresh')
  refresh(@Body('refreshToken') t: string) { return this.auth.rotateRefresh(t); }
  @Post('logout')
  async logout(@Body('refreshToken') t: string) { await this.auth.logout(t); return { ok: true }; }
}
```
```typescript
// auth.module.ts: controllers에 AuthController 추가
```

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: POST /auth/google + refresh + logout (TDD)"
```

---

## Phase E — Apple Sign In + 계정 삭제

### Task E1: POST /auth/apple (TDD)

**Files:**
- Modify: `src/auth/auth.service.ts` (loginWithApple), `src/auth/auth.controller.ts`
- Test: `test/auth-apple.e2e-spec.ts`

- [ ] **Step 1: Write the failing test** (verifyOidcToken 모킹으로 apple sub 반환)
```typescript
// test/auth-apple.e2e-spec.ts — 핵심만
it('유효한 apple identity token으로 JWT를 발급한다', async () => {
  jest.spyOn(verifier, 'verifyOidcToken').mockResolvedValue({ sub: 'apple-1', email: 'a@p.com' });
  const res = await request(app.getHttpServer())
    .post('/auth/apple').send({ identityToken: 'fake.jwt.token' });
  expect(res.status).toBe(201);
  expect(res.body.accessToken).toBeDefined();
});
```
(beforeAll에 `process.env.APPLE_BUNDLE_ID='kr.codeatlas.worktimer'` 설정)

- [ ] **Step 2: Run test** → FAIL

- [ ] **Step 3: Implement loginWithApple**
```typescript
// auth.service.ts에 추가
  async loginWithApple(identityToken: string): Promise<TokenPair> {
    const r = await verifyOidcToken(identityToken, {
      issuer: 'https://appleid.apple.com',
      audience: [this.cfg.get('APPLE_BUNDLE_ID'), this.cfg.get('APPLE_SERVICE_ID')].filter(Boolean) as string[],
      jwksUri: 'https://appleid.apple.com/auth/keys',
    });
    return this.issueForProvider({ provider: 'apple', providerUid: r.sub, email: r.email });
  }
```
```typescript
// auth.controller.ts에 추가
  @Post('apple')
  apple(@Body('identityToken') t: string) { return this.auth.loginWithApple(t); }
```

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: POST /auth/apple identity token 검증 (TDD)"
```

### Task E2: DELETE /auth/account — 계정 삭제 (애플 필수, TDD)

**Files:**
- Modify: `src/auth/auth.service.ts` (deleteAccount), `src/auth/auth.controller.ts`
- Test: `test/account-delete.e2e-spec.ts`

> 애플 정책: 계정 삭제 인앱 제공 필수. 사용자 데이터 하드삭제 + Apple 토큰 revoke. 본 태스크는 DB 하드삭제 + soft-flag. (Apple token revoke API 호출은 클라이언트 secret JWT 필요 → E3에서 보강, 최소 출시엔 삭제만으로도 정책 충족하나 revoke 권장.)

- [ ] **Step 1: Write the failing test**
```typescript
// test/account-delete.e2e-spec.ts — 핵심
it('DELETE /auth/account는 내 데이터와 계정을 삭제한다', async () => {
  const auth = app.get(AuthService);
  const { accessToken } = await auth.issueForProvider({ provider: 'google', providerUid: 'del-1' });
  const res = await request(app.getHttpServer()).delete('/auth/account')
    .set('Authorization', `Bearer ${accessToken}`);
  expect(res.status).toBe(200);
  const prisma = app.get(PrismaService);
  expect(await prisma.user.findFirst({ where: { providerUid: 'del-1' } })).toBeNull();
});
```

- [ ] **Step 2: Run test** → FAIL

- [ ] **Step 3: Implement deleteAccount + endpoint**
```typescript
// auth.service.ts
  async deleteAccount(userId: string): Promise<void> {
    // work_sessions/refresh_tokens/user_settings는 onDelete: Cascade로 함께 삭제
    await this.prisma.user.delete({ where: { id: userId } });
  }
```
```typescript
// auth.controller.ts
import { Delete, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../core/jwt-auth.guard';

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req: any) { await this.auth.deleteAccount(req.user.id); return { ok: true }; }
```

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: DELETE /auth/account 계정 삭제 (cascade, TDD)"
```

---

## Phase F — WorkTimer 세션 + 설정 API

### Task F1: SessionsService — start/end/today-total/ongoing (TDD, 테넌트 격리)

**Files:**
- Create: `src/worktimer/sessions.service.ts`, `src/worktimer/worktimer.module.ts`, `src/worktimer/date.util.ts`
- Test: `src/worktimer/sessions.service.spec.ts`

> 현재 `worktimer-expo/src/lib/session.ts` 로직을 서버로 이전. duration은 서버서 타임스탬프 재계산. 모든 쿼리에 userId 강제.

- [ ] **Step 1: Write the failing test**
```typescript
// src/worktimer/sessions.service.spec.ts — 핵심
describe('SessionsService', () => {
  // ... prisma 테스트 셋업, userA/userB 생성
  it('start → ongoing 조회 → end 시 duration 계산', async () => {
    const s = await service.start(userA, '2026-06-20');
    const ongoing = await service.getOngoing(userA);
    expect(ongoing!.id).toBe(s.id);
    const ended = await service.end(userA, s.id);
    expect(ended.endTime).not.toBeNull();
    expect(ended.duration).toBeGreaterThanOrEqual(0);
  });

  it('테넌트 격리: userB는 userA의 세션을 못 끝낸다', async () => {
    const s = await service.start(userA, '2026-06-20');
    await expect(service.end(userB, s.id)).rejects.toThrow();
  });

  it('today-total은 종료된 세션 duration 합(진행중 제외)', async () => {
    const s1 = await service.start(userA, '2026-06-20'); await service.end(userA, s1.id);
    await service.start(userA, '2026-06-20'); // 진행중
    const total = await service.todayTotal(userA, '2026-06-20');
    expect(typeof total).toBe('number');
  });
});
```

- [ ] **Step 2: Run test** → FAIL

- [ ] **Step 3: Implement SessionsService**
```typescript
// src/worktimer/sessions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  start(userId: string, date: string) {
    return this.prisma.workSession.create({
      data: { userId, startTime: new Date(), endTime: null, duration: 0, date },
    });
  }

  getOngoing(userId: string) {
    return this.prisma.workSession.findFirst({
      where: { userId, endTime: null }, orderBy: { createdAt: 'desc' },
    });
  }

  async end(userId: string, id: string) {
    const s = await this.prisma.workSession.findFirst({ where: { id, userId } });
    if (!s) throw new NotFoundException('session');
    const duration = Math.max(0, Math.floor((Date.now() - s.startTime.getTime()) / 1000));
    return this.prisma.workSession.update({ where: { id }, data: { endTime: new Date(), duration } });
  }

  async todayTotal(userId: string, date: string): Promise<number> {
    const rows = await this.prisma.workSession.findMany({
      where: { userId, date, endTime: { not: null } }, select: { duration: true },
    });
    return rows.reduce((a, r) => a + r.duration, 0);
  }

  list(userId: string, from: string, to: string) {
    return this.prisma.workSession.findMany({
      where: { userId, date: { gte: from, lte: to } }, orderBy: { startTime: 'asc' },
    });
  }

  async remove(userId: string, id: string) {
    const r = await this.prisma.workSession.deleteMany({ where: { id, userId } });
    if (r.count === 0) throw new NotFoundException('session');
  }

  async cleanupOrphaned(userId: string, today: string): Promise<number> {
    const orphans = await this.prisma.workSession.findMany({
      where: { userId, endTime: null, date: { lt: today } },
    });
    for (const o of orphans) {
      const end = new Date(o.date + 'T23:59:59');
      const duration = Math.max(0, Math.floor((end.getTime() - o.startTime.getTime()) / 1000));
      await this.prisma.workSession.update({ where: { id: o.id }, data: { endTime: end, duration } });
    }
    return orphans.length;
  }
}
```
```typescript
// src/worktimer/worktimer.module.ts
import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
@Module({ providers: [SessionsService], exports: [SessionsService] })
export class WorktimerModule {}
```

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: SessionsService — start/end/total/ongoing/cleanup, 테넌트 격리 (TDD)"
```

### Task F2: SessionsController + SettingsService/Controller (TDD)

**Files:**
- Create: `src/worktimer/sessions.controller.ts`, `src/worktimer/settings.service.ts`, `src/worktimer/settings.controller.ts`
- Modify: `src/worktimer/worktimer.module.ts`, `src/app.module.ts`
- Test: `test/sessions.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**
```typescript
// test/sessions.e2e-spec.ts — 핵심
it('인증된 사용자의 세션 라이프사이클 (start→ongoing→end→list)', async () => {
  const auth = app.get(AuthService);
  const { accessToken } = await auth.issueForProvider({ provider: 'google', providerUid: 'sess-1' });
  const h = { Authorization: `Bearer ${accessToken}` };
  const start = await request(app.getHttpServer()).post('/worktimer/sessions').set(h).send({ date: '2026-06-20' });
  expect(start.status).toBe(201);
  const end = await request(app.getHttpServer()).patch(`/worktimer/sessions/${start.body.id}`).set(h);
  expect(end.status).toBe(200);
  const list = await request(app.getHttpServer()).get('/worktimer/sessions?from=2026-06-01&to=2026-06-30').set(h);
  expect(list.body.length).toBe(1);
});
it('토큰 없으면 401', async () => {
  expect((await request(app.getHttpServer()).post('/worktimer/sessions').send({ date: '2026-06-20' })).status).toBe(401);
});
```

- [ ] **Step 2: Run test** → FAIL

- [ ] **Step 3: Implement controllers + settings**
```typescript
// src/worktimer/sessions.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../core/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@Controller('worktimer/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private svc: SessionsService) {}
  @Post() start(@Req() r: any, @Body('date') date: string) { return this.svc.start(r.user.id, date); }
  @Get('ongoing') ongoing(@Req() r: any) { return this.svc.getOngoing(r.user.id); }
  @Get('today-total') total(@Req() r: any, @Query('date') date: string) {
    return this.svc.todayTotal(r.user.id, date).then((total) => ({ total }));
  }
  @Get() list(@Req() r: any, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.list(r.user.id, from, to);
  }
  @Patch(':id') end(@Req() r: any, @Param('id') id: string) { return this.svc.end(r.user.id, id); }
  @Delete(':id') remove(@Req() r: any, @Param('id') id: string) {
    return this.svc.remove(r.user.id, id).then(() => ({ ok: true }));
  }
  @Post('cleanup-orphaned') cleanup(@Req() r: any, @Body('today') today: string) {
    return this.svc.cleanupOrphaned(r.user.id, today).then((cleaned) => ({ cleaned }));
  }
}
```
```typescript
// src/worktimer/settings.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}
  get(userId: string) {
    return this.prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } });
  }
  update(userId: string, data: { dailyGoalSeconds?: number; theme?: string }) {
    return this.prisma.userSettings.upsert({ where: { userId }, update: data, create: { userId, ...data } });
  }
}
```
```typescript
// src/worktimer/settings.controller.ts
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../core/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('worktimer/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private svc: SettingsService) {}
  @Get() get(@Req() r: any) { return this.svc.get(r.user.id); }
  @Patch() update(@Req() r: any, @Body() body: { dailyGoalSeconds?: number; theme?: string }) {
    return this.svc.update(r.user.id, body);
  }
}
```
```typescript
// worktimer.module.ts: controllers/providers에 등록
// providers: [SessionsService, SettingsService]
// controllers: [SessionsController, SettingsController]
// app.module.ts: imports에 WorktimerModule 추가
```

- [ ] **Step 4: Run test** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: 세션/설정 컨트롤러 + SettingsService (TDD)"
```

### Task F3: 전역 ValidationPipe + Throttler + CORS

**Files:**
- Modify: `src/main.ts`, `src/app.module.ts`

- [ ] **Step 1: main.ts에 보안/검증 적용**
```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true }); // 모바일 앱이라 사실상 무관, 추후 제한
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 2: app.module.ts에 ThrottlerModule(인증 보호)**
```typescript
// app.module.ts imports에 추가
import { ThrottlerModule } from '@nestjs/throttler';
// ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
```

- [ ] **Step 3: 전체 테스트 재실행**

Run: `pnpm test && pnpm test:e2e`
Expected: 전부 PASS

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "chore: 전역 ValidationPipe + Throttler + CORS"
```

---

## Phase G — VPS 배포 (45.77.135.225 → api.codeatlas.kr)

> Claude가 SSH로 수행 (op 비번 참조). 각 단계 후 검증.

### Task G1: VPS 하드닝 + 런타임

- [ ] **Step 1: SSH 키 등록 + root 비번로그인 차단**
```bash
# 로컬 공개키를 서버 authorized_keys에 추가 (sshpass로 1회), 이후 키 인증
ssh-copy-id -o StrictHostKeyChecking=accept-new root@45.77.135.225  # 또는 수동 append
# /etc/ssh/sshd_config: PasswordAuthentication no, PermitRootLogin prohibit-password → restart
```

- [ ] **Step 2: 방화벽(ufw) + fail2ban + 자동 보안업데이트**
```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
apt-get update && apt-get install -y fail2ban unattended-upgrades nginx certbot python3-certbot-nginx
```

- [ ] **Step 3: Node 22 + pnpm**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs
corepack enable && corepack prepare pnpm@latest --activate
node -v && pnpm -v
```
Expected: node v22.x, pnpm 활성

- [ ] **Step 4: 검증** — `ufw status` (22/80/443), `nginx -v`, `node -v`

### Task G2: nginx 리버스 프록시 + TLS

- [ ] **Step 1: DNS 전파 확인** — `dig +short api.codeatlas.kr` → `45.77.135.225`

- [ ] **Step 2: nginx 사이트 설정** `/etc/nginx/sites-available/api.codeatlas.kr`
```nginx
server {
  listen 80;
  server_name api.codeatlas.kr;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
```bash
ln -s /etc/nginx/sites-available/api.codeatlas.kr /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

- [ ] **Step 3: Let's Encrypt TLS**
```bash
certbot --nginx -d api.codeatlas.kr --non-interactive --agree-tos -m wjb127@nate.com --redirect
```
Expected: 인증서 발급 + 443 리다이렉트 설정

- [ ] **Step 4: 검증** — `curl -I https://api.codeatlas.kr` (nginx 502 정상 — 앱 아직 없음)

### Task G3: 앱 배포 (아티팩트) + systemd

- [ ] **Step 1: 로컬 빌드**
```bash
cd ~/Project/codeatlas-platform-api && pnpm build
```

- [ ] **Step 2: 서버 디렉토리 + 아티팩트 전송**
```bash
ssh root@45.77.135.225 'mkdir -p /opt/codeatlas-api'
rsync -avz --delete dist/ package.json pnpm-lock.yaml prisma/ root@45.77.135.225:/opt/codeatlas-api/
ssh root@45.77.135.225 'cd /opt/codeatlas-api && pnpm install --prod && pnpm prisma generate'
```

- [ ] **Step 3: `.env` 서버에 주입 (op)** — 사용자가 op에 넣은 값들을 op run으로 생성하거나 수동 작성. 평문 채팅 노출 금지.
```bash
# 서버 /opt/codeatlas-api/.env (op 참조로 채움, 값 출력 X)
# DATABASE_URL, JWT_SECRET, GOOGLE_*, APPLE_* 포함
```

- [ ] **Step 4: systemd 유닛** `/etc/systemd/system/codeatlas-api.service`
```ini
[Unit]
Description=Codeatlas Platform API
After=network.target
[Service]
WorkingDirectory=/opt/codeatlas-api
EnvironmentFile=/opt/codeatlas-api/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=3
User=root
[Install]
WantedBy=multi-user.target
```
```bash
systemctl daemon-reload && systemctl enable --now codeatlas-api
systemctl status codeatlas-api --no-pager
```

- [ ] **Step 5: 스모크 테스트**
```bash
curl -s https://api.codeatlas.kr/health
```
Expected: `{"status":"ok",...}`

- [ ] **Step 6: Commit (배포 스크립트/유닛 레포에 보존)**
```bash
# deploy/codeatlas-api.service, deploy/nginx.conf, deploy/deploy.sh를 레포에 커밋
git add deploy && git commit -m "chore: VPS 배포 산출물(systemd/nginx/deploy script)"
```

### Task G4: 배포 후 인증 스모크 (수동 가이드)

- [ ] **Step 1**: Google/Apple 발급(Task 0-3,0-4) 완료 후 `.env` 갱신 → `systemctl restart codeatlas-api`
- [ ] **Step 2**: 실제 앱(M1)에서 로그인 → `/me` 200 확인. (앱 전까지는 발급된 테스트 id_token으로 `curl POST /auth/google` 검증 가능)

---

## Self-Review 결과

**Spec coverage:**
- 인증 C-2(Apple/Google + JWT + refresh + 계정삭제) → Phase C/D/E ✓
- 데이터모델(users/refresh_tokens/user_settings/work_sessions.user_id) → Task B1 ✓
- 세션 API(session.ts 1:1 이전) → Phase F ✓
- 테넌트 격리(userId 강제) → F1 테스트로 검증 ✓
- 배포(nginx/TLS/systemd/하드닝) → Phase G ✓
- 미포함(의도적): Apple token revoke 정교화는 E2 노트로 후속, M1(앱)은 별도 계획.

**알려진 후속(이 계획 범위 밖):**
- Apple revoke(client_secret JWT) — 계정삭제 시 권장, 최소 출시엔 DB 삭제로 정책 충족. M1 또는 후속 보강.
- 무중단 배포, CI 파이프라인 — 1차는 수동 rsync+restart.
- 푸시 토큰 등록 엔드포인트 — M1에서 추가.

**Type consistency:** AuthService.issueForProvider/issueTokens/rotateRefresh/logout/loginWithGoogle/loginWithApple/deleteAccount, SessionsService.start/getOngoing/end/todayTotal/list/remove/cleanupOrphaned — 컨트롤러 호출과 시그니처 일치 확인됨.
