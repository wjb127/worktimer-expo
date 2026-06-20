# M1 — 앱 멀티테넌시 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** WorkTimer Expo 앱에 Apple/Google 로그인을 붙이고, Supabase 직접 접근을 전부 NestJS API(`api.codeatlas.kr`) 호출로 전환해 사용자별 데이터가 격리된 멀티테넌트 앱으로 만든다.

**Architecture:** 로그인 화면 → 네이티브 소셜로그인(`@react-native-google-signin`, `expo-apple-authentication`)으로 id_token 획득 → `/auth/google`·`/auth/apple`로 보내 우리 JWT 발급 → SecureStore 저장. 모든 데이터는 `apiClient`(fetch 래퍼, Bearer 자동첨부, 401→refresh 재시도) 경유. API는 camelCase, 앱 타입은 snake_case라 클라이언트에서 매핑. 백엔드는 codeatlas 스키마(기존 public.work_sessions 웹과 분리).

**Tech Stack:** Expo SDK 54, React Native 0.81, React Navigation, expo-secure-store, @react-native-google-signin/google-signin, expo-apple-authentication, EAS dev build.

**Reference spec:** `docs/superpowers/specs/2026-06-20-worktimer-multitenancy-platform-design.md` (섹션 8)
**Backend:** `~/Project/codeatlas-platform-api` (라이브 https://api.codeatlas.kr)

---

## 확정 식별자

| 항목 | 값 |
|---|---|
| API base | `https://api.codeatlas.kr` |
| 번들ID(변경) | `com.gawall.worktimer` → `kr.codeatlas.worktimer` |
| Android package | `kr.codeatlas.worktimer` (신규) |
| Google Web client ID | `1052634480432-ght8f11dsq628f9tr7qp05v2opoastto.apps.googleusercontent.com` |
| Google iOS client ID | `1052634480432-1gbe1hcid97kssalcensbb5ciorok5nc.apps.googleusercontent.com` |
| Apple Team | `9Q26686S8R` · Expo owner `@gawall` |

---

## 현재 Supabase 직접 사용 지점 (전부 제거 대상)

| 파일 | 동작 |
|---|---|
| `src/lib/session.ts` | getTodayTotal/getOngoingSession/startSession/endSession/cleanupOrphanedSessions |
| `src/screens/StatsScreen.tsx` | duration 조회 (일/주/월 date·range) |
| `src/screens/history/HeatmapView.tsx` | date,duration range 조회 |
| `src/screens/history/CalendarView.tsx` | range 조회 + 특정일 조회 + **수동 편집(update)** + 삭제 |
| `lib/supabase.ts` | 클라이언트 (M1 종료 시 제거) |

## 테스트 전략 (앱 특성 반영, 정직)

- 앱엔 jest가 없음. **순수 로직(필드매핑·토큰refresh·session 어댑터)만 경량 jest**로 테스트(Phase 2 Task 2-0에서 jest-expo 셋업).
- UI·네이티브 로그인은 **실기기/시뮬레이터 dev build 수동 e2e**가 정본(해피패스 우회 금지, 실제 탭). Phase 6.
- 매 Phase 후 **타입체크**: `npx tsc --noEmit` (앱은 npm).

---

## Phase 0 — 백엔드 보강: 세션 수동편집 엔드포인트

> CalendarView가 세션 시작/종료 시각을 수동 편집함. 백엔드에 해당 엔드포인트가 없어 추가. 레포: `~/Project/codeatlas-platform-api` (pnpm).

### Task 0-1: editTimes 서비스 + PATCH /:id/edit (TDD)

**Files:**
- Modify: `~/Project/codeatlas-platform-api/src/worktimer/sessions.service.ts`
- Modify: `~/Project/codeatlas-platform-api/src/worktimer/sessions.controller.ts`
- Test: `~/Project/codeatlas-platform-api/test/sessions.e2e-spec.ts`

- [ ] **Step 1: Write the failing test** (sessions.e2e-spec.ts에 추가)
```typescript
it('PATCH /:id/edit 는 시작/종료 시각을 수동 수정하고 duration 재계산', async () => {
  const auth = app.get(AuthService);
  const { accessToken } = await auth.issueForProvider({ provider: 'google', providerUid: 'edit-1' });
  const h = { Authorization: `Bearer ${accessToken}` };
  const start = await request(app.getHttpServer()).post('/worktimer/sessions').set(h).send({ date: '2026-06-20' });
  const s = '2026-06-20T09:00:00.000Z';
  const e = '2026-06-20T11:30:00.000Z';
  const res = await request(app.getHttpServer())
    .patch(`/worktimer/sessions/${start.body.id}/edit`).set(h)
    .send({ startTime: s, endTime: e });
  expect(res.status).toBe(200);
  expect(res.body.duration).toBe(9000); // 2.5h
});
```

- [ ] **Step 2: Run** — `cd ~/Project/codeatlas-platform-api && export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/codeatlas_test" && pnpm exec jest --config ./test/jest-e2e.json --runInBand sessions` → FAIL

- [ ] **Step 3: editTimes 서비스** (sessions.service.ts에 추가)
```typescript
  async editTimes(
    userId: string,
    id: string,
    startTime: string,
    endTime: string,
  ) {
    const s = await this.prisma.workSession.findFirst({ where: { id, userId } });
    if (!s) throw new NotFoundException('session');
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    return this.prisma.workSession.update({
      where: { id },
      data: { startTime: start, endTime: end, duration },
    });
  }
```

- [ ] **Step 4: 컨트롤러 라우트** (sessions.controller.ts, `@Patch(':id')` 위에 추가 — 더 구체적 경로 우선)
```typescript
  @Patch(':id/edit')
  edit(
    @Req() r: AuthedReq,
    @Param('id') id: string,
    @Body() body: { startTime: string; endTime: string },
  ) {
    return this.svc.editTimes(r.user.id, id, body.startTime, body.endTime);
  }
```

- [ ] **Step 5: Run** → PASS

- [ ] **Step 6: 빌드 + 배포 + 커밋**
```bash
cd ~/Project/codeatlas-platform-api
pnpm build
rsync -az --delete dist/ root@45.77.135.225:/opt/codeatlas-api/dist/
ssh root@45.77.135.225 'systemctl restart codeatlas-api && sleep 3 && systemctl is-active codeatlas-api'
curl -s https://api.codeatlas.kr/health
git add -A && git commit -m "feat: 세션 수동편집 PATCH /:id/edit (CalendarView용)"
git push origin master
```

---

## Phase 1 — 앱 설정 · 의존성

> 레포: `~/Project/worktimer-expo` (★ npm, Expo 기본)

### Task 1-1: 의존성 설치 + 번들ID 변경

**Files:**
- Modify: `app.json`
- Modify: `package.json` (deps)

- [ ] **Step 1: 라이브러리 설치**
```bash
cd ~/Project/worktimer-expo
npx expo install expo-secure-store expo-apple-authentication @react-native-google-signin/google-signin
```

- [ ] **Step 2: app.json 수정** (bundleId/package/plugins/iOS usesAppleSignIn)
```jsonc
// app.json expo 안에서:
// "ios": { "bundleIdentifier": "kr.codeatlas.worktimer", "usesAppleSignIn": true, ... }
// "android": { "package": "kr.codeatlas.worktimer", ... }
// "plugins": [
//   "expo-live-activity",
//   "expo-secure-store",
//   "expo-apple-authentication",
//   [ "@react-native-google-signin/google-signin",
//     { "iosUrlScheme": "com.googleusercontent.apps.1052634480432-1gbe1hcid97kssalcensbb5ciorok5nc" } ]
// ]
```
> iosUrlScheme = iOS client ID를 reverse한 것(`com.googleusercontent.apps.<iOS client ID 앞부분>`).

- [ ] **Step 3: .env 추가** (`.env`, gitignore 확인)
```bash
# 기존 EXPO_PUBLIC_SUPABASE_* 는 유지(전환 중 참조), 아래 추가:
printf '\nEXPO_PUBLIC_API_URL=https://api.codeatlas.kr\nEXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1052634480432-ght8f11dsq628f9tr7qp05v2opoastto.apps.googleusercontent.com\nEXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1052634480432-1gbe1hcid97kssalcensbb5ciorok5nc.apps.googleusercontent.com\n' >> .env
```

- [ ] **Step 4: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add app.json package.json package-lock.json && git commit -m "chore(M1): 인증 라이브러리 설치 + 번들ID kr.codeatlas.worktimer + plugins/env"
```

---

## Phase 2 — API 클라이언트 + 토큰 저장

### Task 2-0: jest-expo 셋업 (순수 로직 테스트용)

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`

- [ ] **Step 1: 설치**
```bash
cd ~/Project/worktimer-expo
npm install -D jest jest-expo @types/jest
```

- [ ] **Step 2: jest.config.js**
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|@react-native-google-signin)/)',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
```

- [ ] **Step 3: package.json scripts에 추가**
```jsonc
// "scripts": { ..., "test": "jest" }
```

- [ ] **Step 4: 확인 + 커밋**
```bash
npx jest --passWithNoTests
git add -A && git commit -m "chore(M1): jest-expo 셋업"
```

### Task 2-1: 토큰 저장소 (SecureStore) (TDD)

**Files:**
- Create: `src/lib/auth/tokenStore.ts`
- Test: `src/lib/auth/tokenStore.test.ts`

- [ ] **Step 1: Write the failing test** (SecureStore 모킹)
```typescript
// src/lib/auth/tokenStore.test.ts
const mem: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
  getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
  deleteItemAsync: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
}));
import { saveTokens, getAccessToken, getRefreshToken, clearTokens } from './tokenStore';

describe('tokenStore', () => {
  beforeEach(() => Object.keys(mem).forEach((k) => delete mem[k]));
  it('저장/조회/삭제', async () => {
    await saveTokens('acc', 'ref');
    expect(await getAccessToken()).toBe('acc');
    expect(await getRefreshToken()).toBe('ref');
    await clearTokens();
    expect(await getAccessToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Run** — `npx jest tokenStore` → FAIL

- [ ] **Step 3: 구현**
```typescript
// src/lib/auth/tokenStore.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'codeatlas.accessToken';
const REFRESH = 'codeatlas.refreshToken';

export const saveTokens = async (access: string, refresh: string) => {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
};
export const getAccessToken = () => SecureStore.getItemAsync(ACCESS);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH);
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
};
```

- [ ] **Step 4: Run** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(M1): SecureStore 토큰 저장소 (TDD)"
```

### Task 2-2: API 클라이언트 (Bearer + 401 refresh 재시도) (TDD)

**Files:**
- Create: `src/lib/api/client.ts`
- Test: `src/lib/api/client.test.ts`

- [ ] **Step 1: Write the failing test** (fetch + tokenStore 모킹)
```typescript
// src/lib/api/client.test.ts
jest.mock('../auth/tokenStore', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}));
import { apiFetch } from './client';
import * as store from '../auth/tokenStore';

const mockFetch = (responses: Array<{ status: number; body: any }>) => {
  let i = 0;
  global.fetch = jest.fn(() => {
    const r = responses[i++];
    return Promise.resolve({
      status: r.status, ok: r.status < 400,
      json: () => Promise.resolve(r.body),
    } as Response);
  });
};

describe('apiFetch', () => {
  beforeEach(() => jest.clearAllMocks());
  it('access 토큰을 Bearer로 붙인다', async () => {
    (store.getAccessToken as jest.Mock).mockResolvedValue('acc');
    mockFetch([{ status: 200, body: { ok: true } }]);
    await apiFetch('/me');
    const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer acc');
  });

  it('401이면 refresh 후 1회 재시도', async () => {
    (store.getAccessToken as jest.Mock).mockResolvedValueOnce('old').mockResolvedValue('new');
    (store.getRefreshToken as jest.Mock).mockResolvedValue('ref');
    mockFetch([
      { status: 401, body: {} },                                  // 첫 호출 만료
      { status: 201, body: { accessToken: 'new', refreshToken: 'r2' } }, // refresh
      { status: 200, body: { ok: true } },                        // 재시도 성공
    ]);
    const res = await apiFetch('/worktimer/sessions/ongoing');
    expect(res.ok).toBe(true);
    expect(store.saveTokens).toHaveBeenCalledWith('new', 'r2');
  });
});
```

- [ ] **Step 2: Run** → FAIL

- [ ] **Step 3: 구현**
```typescript
// src/lib/api/client.ts
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../auth/tokenStore';

const BASE = process.env.EXPO_PUBLIC_API_URL as string;

async function refresh(): Promise<boolean> {
  const rt = await getRefreshToken();
  if (!rt) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (res.status >= 400) { await clearTokens(); return false; }
  const data = await res.json();
  await saveTokens(data.accessToken, data.refreshToken);
  return true;
}

export async function apiFetch(path: string, init: RequestInit = {}, _retry = true): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401 && _retry) {
    if (await refresh()) return apiFetch(path, init, false);
  }
  return res;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(`API ${res.status} ${path}`);
  return res.json() as Promise<T>;
}
```

- [ ] **Step 4: Run** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(M1): API 클라이언트 — Bearer + 401 refresh 재시도 (TDD)"
```

### Task 2-3: 세션 API 어댑터 (camelCase→snake_case 매핑) (TDD)

**Files:**
- Create: `src/lib/api/sessions.ts`
- Test: `src/lib/api/sessions.test.ts`

> API는 camelCase(startTime…), 앱 `WorkSession` 타입은 snake_case(start_time…). 여기서 매핑해 기존 타입/화면 유지.

- [ ] **Step 1: Write the failing test**
```typescript
// src/lib/api/sessions.test.ts
jest.mock('./client', () => ({ apiJson: jest.fn(), apiFetch: jest.fn() }));
import { mapSession } from './sessions';

describe('mapSession', () => {
  it('camelCase API 응답을 앱 WorkSession(snake_case)로 매핑', () => {
    const api = { id: 'x', userId: 'u', appId: 'worktimer', startTime: '2026-06-20T00:00:00Z',
      endTime: null, duration: 0, date: '2026-06-20', createdAt: '2026-06-20T00:00:00Z' };
    const s = mapSession(api as any);
    expect(s).toEqual({ id: 'x', start_time: '2026-06-20T00:00:00Z', end_time: null,
      duration: 0, date: '2026-06-20', created_at: '2026-06-20T00:00:00Z' });
  });
});
```

- [ ] **Step 2: Run** → FAIL

- [ ] **Step 3: 구현**
```typescript
// src/lib/api/sessions.ts
import { apiJson, apiFetch } from './client';
import { WorkSession } from '../../types/session';

interface ApiSession {
  id: string; startTime: string; endTime: string | null;
  duration: number; date: string; createdAt: string;
}

export const mapSession = (s: ApiSession): WorkSession => ({
  id: s.id,
  start_time: s.startTime,
  end_time: s.endTime,
  duration: s.duration,
  date: s.date,
  created_at: s.createdAt,
});

export const apiGetTodayTotal = (date: string) =>
  apiJson<{ total: number }>(`/worktimer/sessions/today-total?date=${date}`).then((r) => r.total);

export const apiGetOngoing = async (): Promise<WorkSession | null> => {
  const res = await apiFetch('/worktimer/sessions/ongoing');
  if (!res.ok) return null;
  const data = await res.json();
  return data ? mapSession(data) : null;
};

export const apiStart = (date: string) =>
  apiJson<ApiSession>('/worktimer/sessions', { method: 'POST', body: JSON.stringify({ date }) }).then(mapSession);

export const apiEnd = (id: string) =>
  apiJson<ApiSession>(`/worktimer/sessions/${id}`, { method: 'PATCH' }).then(mapSession);

export const apiEditTimes = (id: string, startTime: string, endTime: string) =>
  apiJson<ApiSession>(`/worktimer/sessions/${id}/edit`, {
    method: 'PATCH', body: JSON.stringify({ startTime, endTime }),
  }).then(mapSession);

export const apiDelete = (id: string) =>
  apiFetch(`/worktimer/sessions/${id}`, { method: 'DELETE' }).then(() => undefined);

export const apiListSessions = (from: string, to: string) =>
  apiJson<ApiSession[]>(`/worktimer/sessions?from=${from}&to=${to}`).then((arr) => arr.map(mapSession));

export const apiCleanupOrphaned = (today: string) =>
  apiJson<{ cleaned: number }>('/worktimer/sessions/cleanup-orphaned', {
    method: 'POST', body: JSON.stringify({ today }),
  }).then((r) => r.cleaned);
```

- [ ] **Step 4: Run** → PASS

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(M1): 세션 API 어댑터 + 필드 매핑 (TDD)"
```

---

## Phase 3 — 인증 컨텍스트 + 로그인 화면

### Task 3-1: AuthContext (세션 상태 + 로그인/로그아웃)

**Files:**
- Create: `src/lib/auth/AuthContext.tsx`

- [ ] **Step 1: 구현**
```tsx
// src/lib/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { saveTokens, clearTokens, getAccessToken } from './tokenStore';
import { apiJson } from '../api/client';

interface AuthState {
  loading: boolean;
  signedIn: boolean;
  signInWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getAccessToken();
      setSignedIn(!!t);
      setLoading(false);
    })();
  }, []);

  const signInWithTokens = useCallback(async (a: string, r: string) => {
    await saveTokens(a, r);
    setSignedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    await clearTokens();
    setSignedIn(false);
  }, []);

  return (
    <Ctx.Provider value={{ loading, signedIn, signInWithTokens, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
};
```

- [ ] **Step 2: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat(M1): AuthContext (토큰 기반 로그인 상태)"
```

### Task 3-2: 로그인 화면 (Apple/Google 버튼)

**Files:**
- Create: `src/screens/LoginScreen.tsx`

- [ ] **Step 1: 구현**
```tsx
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { apiJson } from '../lib/api/client';
import { useAuth } from '../lib/auth/AuthContext';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

type Pair = { accessToken: string; refreshToken: string };

export default function LoginScreen() {
  const { signInWithTokens } = useAuth();
  const [busy, setBusy] = useState(false);

  const google = async () => {
    try {
      setBusy(true);
      await GoogleSignin.hasPlayServices();
      const info = await GoogleSignin.signIn();
      const idToken = info.data?.idToken;
      if (!idToken) throw new Error('no idToken');
      const pair = await apiJson<Pair>('/auth/google', {
        method: 'POST', body: JSON.stringify({ idToken }),
      });
      await signInWithTokens(pair.accessToken, pair.refreshToken);
    } catch (e: any) {
      Alert.alert('구글 로그인 실패', String(e?.message ?? e));
    } finally { setBusy(false); }
  };

  const apple = async () => {
    try {
      setBusy(true);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('no identityToken');
      const pair = await apiJson<Pair>('/auth/apple', {
        method: 'POST', body: JSON.stringify({ identityToken: cred.identityToken }),
      });
      await signInWithTokens(pair.accessToken, pair.refreshToken);
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('애플 로그인 실패', String(e?.message ?? e));
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WorkTimer</Text>
      <Text style={styles.sub}>로그인하고 어디서든 기록을 이어가세요</Text>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleBtn}
          onPress={apple}
        />
      )}

      <TouchableOpacity style={styles.googleBtn} onPress={google} disabled={busy}>
        <Text style={styles.googleText}>Google로 계속하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 15, color: '#666', marginBottom: 40 },
  appleBtn: { width: 260, height: 48, marginBottom: 12 },
  googleBtn: { width: 260, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#222' },
});
```

- [ ] **Step 2: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat(M1): 로그인 화면 (Apple/Google 버튼)"
```

### Task 3-3: App.tsx 인증 게이팅

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: App.tsx 래핑** (AuthProvider + 로그인 분기)
```tsx
// App.tsx — 구조 변경: AuthProvider로 감싸고, signedIn 아니면 LoginScreen
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/lib/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
// (기존 import 유지: NavigationContainer, createBottomTabNavigator, Ionicons, screens)

function Root() {
  const { loading, signedIn } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  }
  if (!signedIn) return <LoginScreen />;
  return (
    <NavigationContainer>
      {/* 기존 Tab.Navigator 블록 그대로 이동 */}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
```
> 기존 `export default function App` 안의 `<NavigationContainer>…</NavigationContainer>` 전체를 `Root`의 return으로 옮기고, StatusBar는 Root 안에 유지.

- [ ] **Step 2: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat(M1): App 인증 게이팅 (미로그인→LoginScreen)"
```

---

## Phase 4 — session.ts를 API로 전환 (시그니처 유지)

### Task 4-1: src/lib/session.ts 내부를 API 호출로 교체

**Files:**
- Modify: `src/lib/session.ts` (전체 재작성 — export 시그니처는 유지해 화면 영향 최소화)

> 기존 export: `getTodayTotal()`, `getOngoingSession()`, `startSession()`, `endSession(id, startTime)`, `cleanupOrphanedSessions(excludeId?)`. 시그니처 유지하되 내부를 API로.

- [ ] **Step 1: 재작성**
```typescript
// src/lib/session.ts
import { WorkSession } from '../types/session';
import { getLocalToday } from './dateUtils';
import {
  apiGetTodayTotal, apiGetOngoing, apiStart, apiEnd, apiCleanupOrphaned,
} from './api/sessions';

const getToday = (): string => getLocalToday();

export const getTodayTotal = async (): Promise<number> => {
  try { return await apiGetTodayTotal(getToday()); }
  catch (e) { console.error('getTodayTotal error:', e); return 0; }
};

export const getOngoingSession = async (): Promise<WorkSession | null> => {
  try { return await apiGetOngoing(); }
  catch (e) { console.error('getOngoingSession error:', e); return null; }
};

export const startSession = async (): Promise<WorkSession | null> => {
  try { return await apiStart(getToday()); }
  catch (e) { console.error('startSession error:', e); return null; }
};

// startTime 인자는 더 이상 안 쓰지만 호출부 호환 위해 시그니처 유지
export const endSession = async (
  sessionId: string,
  _startTime?: string,
): Promise<WorkSession | null> => {
  try { return await apiEnd(sessionId); }
  catch (e) { console.error('endSession error:', e); return null; }
};

export const cleanupOrphanedSessions = async (
  _excludeSessionId?: string,
): Promise<number> => {
  try { return await apiCleanupOrphaned(getToday()); }
  catch (e) { console.error('cleanupOrphanedSessions error:', e); return 0; }
};
```
> duration·자정·고아 처리는 서버가 함. `endSession`의 startTime, `cleanupOrphanedSessions`의 excludeId는 서버가 JWT/로직으로 처리하므로 무시(시그니처만 유지).

- [ ] **Step 2: 타입체크** — `npx tsc --noEmit` → 통과 (TimerScreen 호출부 변경 불필요)

- [ ] **Step 3: Commit**
```bash
git add src/lib/session.ts && git commit -m "feat(M1): session.ts 내부를 API 호출로 전환 (시그니처 유지)"
```

---

## Phase 5 — 화면 직접 Supabase 제거 + 설정

### Task 5-1: StatsScreen — supabase → apiListSessions

**Files:**
- Modify: `src/screens/StatsScreen.tsx`

> 3개 쿼리 모두 `select('duration')` + date/range. `apiListSessions(from,to)`로 받아 duration 합산. 단일 날짜는 from=to=date.

- [ ] **Step 1: import 교체** — `import { supabase } from '../../lib/supabase';` 제거 → `import { apiListSessions } from '../lib/api/sessions';`

- [ ] **Step 2: 쿼리 3곳 교체** (패턴)
```typescript
// 단일 날짜 (기존 .eq('date', dateString)):
const sessions = await apiListSessions(dateString, dateString);
// 합산: const total = sessions.reduce((s, x) => s + (x.duration || 0), 0);

// 범위 (기존 .gte/.lte):
const sessions = await apiListSessions(startString, endString);
// 이후 기존 집계 로직 그대로 (sessions는 WorkSession[] — duration 필드 동일)
```
> 기존 `data` 변수명을 `sessions`로 맞추고, `sessions.reduce(...)` 집계 로직은 유지. null 체크는 빈 배열로 대체.

- [ ] **Step 3: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat(M1): StatsScreen supabase→API"
```

### Task 5-2: HeatmapView — supabase → apiListSessions

**Files:**
- Modify: `src/screens/history/HeatmapView.tsx`

- [ ] **Step 1: import 교체** — supabase 제거 → `import { apiListSessions } from '../../lib/api/sessions';`

- [ ] **Step 2: 쿼리 교체** (기존 select date,duration gte/lte)
```typescript
const data = await apiListSessions(startDate, endDate);
// 이후 date별 그룹/색상 로직 그대로 (data: WorkSession[], date·duration 필드 동일)
```

- [ ] **Step 3: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat(M1): HeatmapView supabase→API"
```

### Task 5-3: CalendarView — supabase → API (조회/편집/삭제)

**Files:**
- Modify: `src/screens/history/CalendarView.tsx`

- [ ] **Step 1: import 교체**
```typescript
import { apiListSessions, apiEditTimes, apiDelete } from '../../lib/api/sessions';
```

- [ ] **Step 2: 월 범위 조회** (기존 gte/lte month)
```typescript
const data = await apiListSessions(startOfMonth, endOfMonth);
```

- [ ] **Step 3: 특정일 조회** (기존 select * eq date)
```typescript
const data = await apiListSessions(date, date);
```

- [ ] **Step 4: 수동 편집** (기존 update set ... eq id)
```typescript
// editingSession의 새 시작/종료 ISO 문자열로:
await apiEditTimes(editingSession.id, newStartIso, newEndIso);
// (기존 코드가 start_time/end_time/duration을 직접 set했다면, start/end만 보내고 duration은 서버가 계산)
```

- [ ] **Step 5: 삭제** (기존 delete eq id)
```typescript
await apiDelete(editingSession.id);
```

- [ ] **Step 6: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat(M1): CalendarView supabase→API (조회/편집/삭제)"
```

### Task 5-4: SettingsScreen — 로그아웃 + 계정삭제

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: import + 훅**
```typescript
import { useAuth } from '../lib/auth/AuthContext';
import { apiFetch } from '../lib/api/client';
import { Alert } from 'react-native';
// 컴포넌트 안: const { signOut } = useAuth();
```

- [ ] **Step 2: 핸들러 (설정 화면 하단에 두 버튼 추가)**
```typescript
const handleLogout = () => {
  Alert.alert('로그아웃', '로그아웃하시겠어요?', [
    { text: '취소', style: 'cancel' },
    { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
  ]);
};

const handleDeleteAccount = () => {
  Alert.alert('계정 삭제', '모든 기록이 영구 삭제됩니다. 계속할까요?', [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: async () => {
      try { await apiFetch('/auth/account', { method: 'DELETE' }); }
      finally { await signOut(); }
    } },
  ]);
};
```

- [ ] **Step 3: 버튼 JSX 추가** (기존 설정 섹션 하단)
```tsx
<TouchableOpacity onPress={handleLogout} style={{ padding: 16 }}>
  <Text style={{ color: '#007AFF', fontSize: 16 }}>로그아웃</Text>
</TouchableOpacity>
<TouchableOpacity onPress={handleDeleteAccount} style={{ padding: 16 }}>
  <Text style={{ color: '#FF3B30', fontSize: 16 }}>계정 삭제</Text>
</TouchableOpacity>
```
> 애플 정책상 계정삭제는 인앱 필수 — 이 버튼이 그 요건 충족.

- [ ] **Step 4: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat(M1): 설정 로그아웃 + 계정삭제(애플 필수)"
```

### Task 5-5: lib/supabase.ts 제거 + 의존성 정리

**Files:**
- Delete: `lib/supabase.ts`
- Modify: `package.json` (@supabase/supabase-js 제거), `.env` (SUPABASE_* 제거)

- [ ] **Step 1: 잔여 supabase 참조 0 확인**
```bash
grep -rn "supabase" src lib --include=*.ts --include=*.tsx | grep -v "//"
# 결과 없어야 함
```

- [ ] **Step 2: 제거**
```bash
rm lib/supabase.ts
npm uninstall @supabase/supabase-js
# .env에서 EXPO_PUBLIC_SUPABASE_* 두 줄 삭제
```

- [ ] **Step 3: 타입체크 + 커밋**
```bash
npx tsc --noEmit
git add -A && git commit -m "chore(M1): Supabase 클라이언트/의존성 제거 (API 전환 완료)"
```

---

## Phase 6 — Dev 빌드 + 실기기 E2E 검증

> 네이티브 모듈(구글/애플 로그인)이라 Expo Go 불가 → EAS dev build 필요.

### Task 6-1: dev 빌드

- [ ] **Step 1: prebuild + EAS dev 빌드 (iOS)**
```bash
cd ~/Project/worktimer-expo
eas build --profile development --platform ios
```
> 번들ID 변경됐으니 EAS가 새 자격증명 생성할 수 있음(@gawall 계정). Apple Team `9Q26686S8R` 선택.

- [ ] **Step 2: 시뮬레이터/기기 설치 + dev 서버**
```bash
npx expo start --dev-client
```

### Task 6-2: 실기기 E2E (사람 행동 그대로 — 해피패스 우회 금지)

- [ ] **시나리오 1 (로그인)**: 앱 실행 → LoginScreen 표시 확인 → **Apple 버튼 실제 탭** → 애플 다이얼로그 → 인증 → 메인 탭으로 전환. (구글 버튼도 동일)
- [ ] **시나리오 2 (세션)**: 타이머 시작 탭 → 잠시 후 정지 → 기록 탭에서 오늘 세션 보임. **다른 계정으로 로그인 시 그 세션 안 보임**(테넌트 격리 육안 확인).
- [ ] **시나리오 3 (편집/삭제)**: 달력에서 세션 탭 → 시간 수정 저장 → 반영 확인 → 삭제 → 사라짐.
- [ ] **시나리오 4 (통계/히트맵)**: 통계·히트맵 탭이 API 데이터로 정상 렌더.
- [ ] **시나리오 5 (재시작 영속)**: 앱 강제종료 후 재실행 → 로그인 유지(SecureStore) → 데이터 그대로.
- [ ] **시나리오 6 (로그아웃/삭제)**: 설정 → 로그아웃 → LoginScreen. 재로그인 → 데이터 복구. 계정삭제 → 데이터 사라지고 LoginScreen.
- [ ] 각 시나리오 스크린샷 증거 확보. FAIL이면 멈추고 원인 보고(운영 백엔드 로그 `journalctl -u codeatlas-api` 참고).

### Task 6-3: 메모리 갱신 + 마무리

- [ ] `/mem` 으로 M1 완료 반영 (04/05 갱신: 앱 전환 완료, public.work_sessions 의존 제거).

---

## Self-Review 결과

**Spec coverage (스펙 섹션 8):**
- 로그인 화면(Apple/Google) → Task 3-2 ✓
- 온보딩/스플래시 분기 → Task 3-3 (loading→gating) ✓
- API 클라이언트(fetch+토큰+401refresh) → Task 2-2 ✓
- SecureStore 토큰 → Task 2-1 ✓
- session.ts + 화면 Supabase 제거 → Phase 4·5 ✓
- 설정 로그아웃+계정삭제(애플 필수) → Task 5-4 ✓
- 백엔드 수동편집 갭 → Task 0-1 (추가 발견분) ✓
- 푸시 토큰 등록 → **이번 범위 밖**(M2/후속, 알림은 로컬 유지)

**알려진 후속(범위 밖):** Google Android client(SHA-1)·Apple Service ID/.p8(revoke)·푸시토큰 등록·UI/UX 고도화(M2).

**Type consistency:** apiStart/apiEnd/apiEditTimes/apiDelete/apiListSessions/apiGetOngoing/apiGetTodayTotal/apiCleanupOrphaned + mapSession(snake_case) ↔ session.ts 시그니처(getTodayTotal/getOngoingSession/startSession/endSession/cleanupOrphanedSessions) 일치 확인.
