# 아키텍처 — 앱 구조 / 네비게이션 / 파일 맵

**최종 갱신**: 2026-06-20

WorkTimer 앱의 전체 구조, 탭 네비게이션, 디렉토리 레이아웃 한눈 정리.
펴볼 때: 새 화면/기능 추가 위치 찾을 때, 파일이 어디 있는지 헷갈릴 때.

## 정체

개인용 업무시간 트래킹 모바일 앱. React Native + **Expo 54** (newArch OFF, bridgeless OFF), 백엔드는 Supabase.
시작/정지 타이머 + 기록(달력·히트맵) + 통계 + 설정 + iOS Live Activity(잠금화면 타이머).

- 패키지매니저: **npm** (package-lock.json 사용 — 이 프로젝트는 pnpm 아님, Expo 기본)
- React 19.1.0 / RN 0.81.5 / TypeScript 5.9
- Git: `github.com/wjb127/worktimer-expo` (origin/master)
- iOS bundleId: `com.gawall.worktimer` · EAS owner: `gawall`

## 네비게이션 (App.tsx)

Bottom Tab Navigator 4탭, 아이콘은 Ionicons(@expo/vector-icons), active 색 `#007AFF`:

```
App.tsx (Bottom Tabs)
├── 타이머  TimerScreen        시작/정지, 진행 링(분당 1회전), Live Activity 트리거
├── 기록    HistoryScreen      Material Top Tabs 2개
│   ├── CalendarView           월별 달력 + 세션 편집 (초록 강도 히트맵)
│   └── HeatmapView            GitHub식 연간 히트맵 (색 기준 3/6/9/12시간)
├── 통계    StatsScreen        일/주/월 막대 차트
└── 설정    SettingsScreen     알림(출근 리마인더·인터벌) + 앱 설정
```

화면 등록·아이콘 매핑은 전부 `App.tsx` 한 파일. 새 탭 추가도 여기.

## 디렉토리 맵

```
App.tsx                  엔트리 (탭 네비게이터)
index.ts                 expo 등록
lib/supabase.ts          Supabase 클라이언트 단일 인스턴스
src/
  lib/
    session.ts           세션 CRUD (핵심 — 02 문서 참고)
    notifications.ts     expo-notifications 스케줄링 (320줄)
    liveActivity.ts      iOS Live Activity 제어 (136줄)
    dateUtils.ts         로컬 타임존 YYYY-MM-DD (UTC 자정 버그 방지 — 02 참고)
  screens/
    TimerScreen.tsx      336줄
    HistoryScreen.tsx    33줄 (Top Tab 래퍼)
    StatsScreen.tsx      454줄
    SettingsScreen.tsx   587줄 (가장 큼 — 알림 설정 전부)
    history/
      CalendarView.tsx   717줄 (가장 큼 — 달력+세션편집)
      HeatmapView.tsx    504줄
    index.ts             화면 배럴 export
  types/session.ts       WorkSession / SessionInsert 인터페이스
supabase/migrations/     001_create_work_sessions.sql
ios/LiveActivity/        Swift 위젯 (WidgetKit, ActivityKit)
plugins/withLiveActivity.js  config plugin (네이티브 위젯 주입)
docs/                    PRD, 세션로그, 구현노트 다수 (히스토리)
```

## 같이 보면 좋은 문서
- `02-data-layer.md` — Supabase 스키마·세션 로직·자정 넘김/고아세션 처리
- `03-build-deploy.md` — EAS 빌드·환경변수·Live Activity 빌드 주의점
