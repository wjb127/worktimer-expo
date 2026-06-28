# 필타임 (Filltime) — Expo + NestJS API

React Native(Expo) 업무시간 추적 앱. codeatlas 멀티테넌트 플랫폼의 첫 번째 앱.

> ⚠️ 이 앱은 **Supabase에 직접 접근하지 않는다.** 모든 데이터는 NestJS API(`api.codeatlas.kr`)를 JWT 인증으로 호출한다. (과거 Supabase 직통 구조에서 전환됨 — `memory/05-architecture-roadmap.md` 참고)

## 기술 스택

- **Frontend**: React Native + Expo (SDK 54)
- **Backend**: codeatlas NestJS API (`codeatlas-platform-api`, VPS) — 자체 OAuth(Apple/Google) + JWT(access 15m / refresh 30d)
- **DB**: 공유 Supabase의 `codeatlas` 스키마 (앱은 직접 접근 X, API 경유)
- **Language**: TypeScript

## 아키텍처

```
App.tsx (인증 분기: signedIn → 하단탭 5개, 아니면 LoginScreen)
├── 타이머 (TimerScreen)      세션 시작/종료 + 종료 시 업무기록 모달
├── 기록 (HistoryScreen)      달력 / 히트맵 / 통계 (Material Top Tabs)
├── 할일 (TodoScreen)         todos CRUD + 완료/누적시간
├── AI분석 (AnalysisScreen)   출시 예정(잠금)
└── 설정 (SettingsScreen)     프로필 / 알림 / 계정

데이터 레이어 (src/lib/)
├── api/client.ts    apiFetch — Bearer 주입 + 401 자동 refresh + 만료 전파
├── api/sessions.ts  세션 CRUD (API camelCase → 앱 snake_case 매핑)
├── api/todos.ts     할일 CRUD + 세션-할일 연결 + 세션 메타
├── api/profile.ts   /me · /me/stats · /me/settings
├── api/config.ts    /config/banners (SDUI 배너)
└── auth/            AuthContext + tokenStore(SecureStore 기반 토큰)
```

## 시작하기

```bash
npm install

# 개발 서버 (dev-client 필요 — 커스텀 네이티브 모듈)
npx expo start --dev-client

# 실기기 빌드 (EAS)
eas build --profile development --platform ios      # dev (Metro 연결)
eas build --profile preview --platform android      # 독립 테스트 빌드
eas build --profile production --platform ios       # 스토어
```

## 환경 변수

`.env` (gitignore됨) / EAS 빌드 env:

- `EXPO_PUBLIC_API_URL`: codeatlas API base URL (예: `https://api.codeatlas.kr`) — **필수, 누락 시 앱이 명시적으로 throw**
- `EXPO_PUBLIC_E2E`: `1`이면 dev-login 버튼 노출(E2E 검증용). 스토어 빌드에선 미설정.
- Google OAuth: `app.json`의 webClientId (Android는 pkg+SHA로 매칭, 앱에선 clientId 미사용)

## 검증

```bash
npx tsc --noEmit     # 1차 타입 게이트 (RN은 pnpm build 아님)
npm test             # jest
```

## 참고 문서

- `memory/05-architecture-roadmap.md` — 전체 아키텍처/마일스톤
- `memory/09-launch-roadmap.md` — 출시 로드맵 + 기술부채
- `memory/06-app-multitenancy-m1.md` — 멀티테넌트 인증/API 전환
- `CLAUDE.md` — Claude Code 작업 가이드
