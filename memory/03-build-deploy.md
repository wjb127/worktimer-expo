# 빌드 / 배포 — EAS / Live Activity / 환경

**최종 갱신**: 2026-06-20

EAS 빌드 프로파일, iOS Live Activity 네이티브 구성, 환경변수 정리.
펴볼 때: 빌드 깨질 때, TestFlight/스토어 올릴 때, Live Activity 안 뜰 때.

## 개발/실행

```bash
npx expo start                  # 개발 서버
npx expo start --ios            # iOS 시뮬레이터
npx expo start --dev-client     # 실기기 dev build 연결
```
package.json scripts: start / android(`expo run:android`) / ios(`expo run:ios`) / web.

## EAS 빌드 (`eas.json`)

| 프로파일 | 용도 | 특징 |
|---|---|---|
| development | dev 서버 연결 빌드 | developmentClient, distribution internal, ios.simulator false |
| preview | 단독 테스트 빌드 | distribution internal |
| production | 스토어 빌드 | 기본값 |

```bash
eas build --profile development --platform ios
eas build --profile preview --platform ios
eas build --profile production --platform ios
```

- EAS projectId: `31c0b3a1-6f4a-4b05-ad00-89924a249f68`
- EAS owner: `gawall` · iOS bundleId: `com.gawall.worktimer`
- `ITSAppUsesNonExemptEncryption: false` (수출규정 면제 선언됨)
- newArch **OFF**, bridgeless **OFF** (app.json experiments) — 켜면 Live Activity / 일부 네이티브 깨질 수 있으니 주의.

## iOS Live Activity (잠금화면/다이나믹아일랜드 타이머)

- 라이브러리: `expo-live-activity ^0.4.2` (app.json plugins에 등록)
- config plugin: `plugins/withLiveActivity.js` — 네이티브 위젯 타깃 주입
- Swift 소스: `ios/LiveActivity/*.swift` (WidgetKit/ActivityKit, LiveActivityWidget.swift 등)
- 제어 로직: `src/lib/liveActivity.ts` — start/update/end, 진행률 기준 **DAILY_GOAL = 15시간**(15*3600초)
- 시뮬레이터에선 Live Activity 제한적 → **실기기 + dev/preview 빌드**로 확인.
- 관련 설계 문서: `docs/LIVE_ACTIVITY_IMPLEMENTATION.md`, `docs/LIVE_ACTIVITY_IMPROVEMENT_PROPOSAL.md`

## 환경변수 (`.env`, git 제외)

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
`EXPO_PUBLIC_` 접두사라 클라이언트 번들에 노출됨(정상 — anon 키라 괜찮음). 실제 값은 `.private/` 또는 Supabase 대시보드.

## 알림 (`src/lib/notifications.ts`)

- `expo-notifications`. 핸들러에서 alert/sound/banner/list 표시.
- AsyncStorage 키 prefix `@settings/`: workReminderEnabled/Time/Days, workIntervalNotificationEnabled/Minutes.
- 출근 리마인더(요일+시각) + 인터벌 알림(N분마다). 요일 타입 `WeekDay` 0=일~6=토.
- 설정 UI는 `SettingsScreen.tsx`(587줄).

## 주의

- `.gitignore`가 `/ios`, `/android` 통째 제외 → 네이티브 폴더는 git에 없음. Live Activity Swift는 로컬/prebuild 산출물. 네이티브 변경은 config plugin(`plugins/withLiveActivity.js`)에 반영해야 재현됨.

## 같이 보면 좋은 문서
- `01-architecture.md` · `02-data-layer.md`
