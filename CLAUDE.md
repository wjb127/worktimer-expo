# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

필타임(Filltime, 구 WorkTimer) is a work time tracking mobile app built with React Native Expo. It is the first app of the **codeatlas multi-tenant platform**. Users start/stop work sessions, log what they worked on, manage todos, view history (calendar/heatmap/stats), and configure notifications.

> ⚠️ The app does **NOT** talk to Supabase directly. All data goes through the **codeatlas NestJS API** (`api.codeatlas.kr`) with JWT auth (access 15m / refresh 30d). The Supabase `codeatlas` schema sits behind that API. See `memory/05-architecture-roadmap.md`.

## Development Commands

```bash
# Start development server
npx expo start

# Start on iOS simulator
npx expo start --ios

# Start with dev client (for development builds on physical devices)
npx expo start --dev-client

# EAS Builds
eas build --profile development --platform ios  # Dev build (needs dev server)
eas build --profile preview --platform ios      # Standalone build for testing
eas build --profile production --platform ios   # App Store build
```

## Environment Variables

Required in `.env` / EAS build env:
- `EXPO_PUBLIC_API_URL` - codeatlas API base URL (e.g. `https://api.codeatlas.kr`). **Required — the app throws if missing (fail-fast in `src/lib/api/client.ts`).**
- `EXPO_PUBLIC_E2E` - `1` shows the dev-login button for E2E. Unset in store builds.

## Architecture

### Navigation Structure
```
App.tsx (인증 분기: signedIn → Bottom Tabs, else LoginScreen)
├── 타이머 (TimerScreen) - timer start/stop + session-end logging modal
├── 기록 (HistoryScreen) - Material Top Tabs
│   ├── CalendarView - monthly calendar (2h blue scale, session editing)
│   ├── HeatmapView - yearly heatmap
│   └── StatsScreen - daily/weekly/monthly bar charts (merged in from old 통계 tab)
├── 할일 (TodoScreen) - todos CRUD + done toggle + accrued time
├── AI분석 (AnalysisScreen) - 출시 예정 (locked)
└── 설정 (SettingsScreen) - profile / notifications / account
```

### Data Layer (all via NestJS API, JWT-authed)
- `src/lib/api/client.ts` - `apiFetch`: Bearer injection + 401 auto-refresh + auth-expiry propagation (`setAuthExpiredHandler`)
- `src/lib/api/sessions.ts` - session CRUD (API camelCase → app snake_case mapping)
- `src/lib/api/todos.ts` - todos CRUD + session↔todo linking + session meta
- `src/lib/api/profile.ts` - `/me` · `/me/stats` · `/me/settings`
- `src/lib/api/config.ts` - `/config/banners` (SDUI)
- `src/lib/auth/` - AuthContext + tokenStore (SecureStore-backed tokens)
- `src/lib/session.ts` - thin wrappers (getTodayTotal, getOngoingSession, startSession, endSession)
- `src/lib/notifications.ts` - local notification scheduling (prefix-scoped cancel)

### Database Schema (codeatlas schema, accessed via API only)
`work_sessions` table:
- `id` (UUID), `start_time`, `end_time` (NULL = ongoing), `duration` (seconds), `date` (YYYY-MM-DD), `created_at`
Related: `todos`, `session_todos` (M:N link), `session_meta` (category/description).

## Key Patterns

- Sessions with `end_time = NULL` are considered ongoing
- Duration is computed server-side from timestamps when a session ends
- Calendar/heatmap use a **blue** 2-hour-bucket scale (`src/theme/colors.ts`), not green
- Timer progress ring completes once per minute
- New native build NOT needed for JS-only changes — Metro serves them live (see `memory/08-expo-gotchas.md`)

## Infra credentials (1Password references only — never write values)

- `api.codeatlas.kr` runs through **Cloudflare Tunnel** `codeatlas-api` since 2026-11-27 (details: `memory/04-platform-backend.md`).
- Cloudflare API token for Tunnel edit + `codeatlas.kr` DNS edit: `op://AI-Agents/4oj2qbb3nyduuug3e7ttwma2r4/credential`
  - ⚠️ Title is "CF API 토큰 codeatlas-tunnel-dns (qhv147 계정, …)" — searching "filltime"/"worktimer" will NOT find it. Use the ID.
  - Use it piped as `Authorization: Bearer` for `accounts/46e9985a2cd78037a239e6a0a1a4067d/cfd_tunnel/...` and `zones/a6b374a69ec4558c86093424711a7a82/dns_records/...`
- Older CF token `op://Dev-Clients/otdvwuq4kkzw7xakwqwrcamshi/password` (title "개발자 CF 계정 토큰(위승빈)") — R2 backup/rclone credential source; it has Tunnel **read only**, no Tunnel edit.
