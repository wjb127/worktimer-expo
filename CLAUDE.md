# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WorkTimer is a personal work time tracking mobile app built with React Native Expo and Supabase backend. Users can start/stop work sessions, view history in calendar/heatmap views, see statistics, and configure notifications.

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

Required in `.env`:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Architecture

### Navigation Structure
```
App.tsx (Bottom Tab Navigator)
├── 타이머 (TimerScreen) - Main timer with start/stop
├── 기록 (HistoryScreen) - Material Top Tabs
│   ├── CalendarView - Monthly calendar with session editing
│   └── HeatmapView - GitHub-style yearly heatmap
├── 통계 (StatsScreen) - Daily/Weekly/Monthly bar charts
└── 설정 (SettingsScreen) - Notifications and app settings
```

### Data Layer
- `lib/supabase.ts` - Supabase client initialization
- `src/lib/session.ts` - Session CRUD operations (getTodayTotal, getOngoingSession, startSession, endSession)
- `src/lib/notifications.ts` - Push notification scheduling

### Database Schema (Supabase)
`work_sessions` table:
- `id` (UUID) - Primary key
- `start_time` (TIMESTAMPTZ) - Session start
- `end_time` (TIMESTAMPTZ, nullable) - NULL means ongoing session
- `duration` (INTEGER) - Duration in seconds
- `date` (DATE) - Session date (YYYY-MM-DD)
- `created_at` (TIMESTAMPTZ)

## Key Patterns

- Sessions with `end_time = NULL` are considered ongoing
- Duration is calculated and stored in seconds when session ends
- CalendarView uses green color scale for heatmap intensity
- Timer displays progress ring that completes once per minute
