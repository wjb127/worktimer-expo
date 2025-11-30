# WorkTimer 구현 요약 문서

## 개요
WorkTimer는 개인 업무 시간 추적 앱으로, React Native Expo와 Supabase를 기반으로 구축되었습니다.

## 최근 구현 내역 (2024-11-30)

---

## 1. iOS Live Activity 지원

### 사용 라이브러리
- `expo-live-activity` by Software Mansion Labs

### 기능
- 잠금화면에서 실시간 업무 시간 확인
- Dynamic Island 지원
- 10초마다 자동 업데이트

### 핵심 파일
- `src/lib/liveActivity.ts` - Live Activity 래퍼 함수
- `app.json` - expo-live-activity 플러그인 등록

### API 사용법
```typescript
import { startLiveActivity, updateLiveActivity, endLiveActivity } from '../lib/liveActivity';

// 타이머 시작 시
await startLiveActivity(new Date(), todayTotal);

// 10초마다 업데이트
await updateLiveActivity(elapsedSeconds, todayTotal);

// 타이머 종료 시
await endLiveActivity();
```

### 주의사항
- `stopActivity`에 state 파라미터 필수
- `timerType`: 'digital' 또는 'circular' (countUp 없음)
- `progressViewTint` 사용 (progressBarColor 아님)

---

## 2. 사용자 설정 가능한 알림 주기

### 기능
- 업무 중 반복 알림 주기를 사용자가 설정 가능
- 10분 ~ 20시간 범위

### 설정 옵션
| 주기 | 값(분) |
|------|--------|
| 10분 | 10 |
| 15분 | 15 |
| 20분 | 20 |
| 30분 | 30 |
| 45분 | 45 |
| 1시간 | 60 |
| 1시간 30분 | 90 |
| 2시간 | 120 |
| 3시간 | 180 |
| 4시간 | 240 |
| 6시간 | 360 |
| 8시간 | 480 |
| 12시간 | 720 |
| 20시간 | 1200 |

### 핵심 파일
- `src/lib/notifications.ts`
  - `WorkIntervalSettings` 인터페이스
  - `getWorkIntervalSettings()` / `saveWorkIntervalSettings()`
  - `scheduleIntervalWorkNotifications()`
- `src/screens/SettingsScreen.tsx` - 설정 UI

### 사용법
설정 > 업무 중 알림 > 반복 알림 활성화 > 알림 주기 선택

---

## 3. 기록 탭 오늘의 총 업무시간 표시

### 기능
- 기록 탭(CalendarView) 상단에 오늘의 총 업무시간 표시
- 완료된 세션 + 진행 중인 세션 경과 시간 합산

### 핵심 파일
- `src/screens/history/CalendarView.tsx`
  - `loadTodayTotal()` 함수 추가
  - 상단에 `todayTotalContainer` UI 추가

### UI
```
┌─────────────────────────────┐
│    오늘의 총 업무시간        │
│        5시간 30분           │
└─────────────────────────────┘
```

---

## 4. 타임존 문제 수정

### 문제
`toISOString().split('T')[0]`은 UTC 기준으로 날짜를 반환하여, 한국(UTC+9)에서 자정~오전 9시 사이에 전날 날짜가 기록되는 문제

### 해결
로컬 타임존 기준 날짜 유틸리티 함수 생성

### 핵심 파일
- `src/lib/dateUtils.ts` (신규)

```typescript
// 로컬 타임존 기준 날짜 문자열 반환
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalToday = (): string => formatDateString(new Date());
export const getMonthStart = (year: number, month: number): string => { ... };
export const getMonthEnd = (year: number, month: number): string => { ... };
```

### 수정된 파일
- `src/lib/session.ts`
- `src/screens/history/CalendarView.tsx`
- `src/screens/history/HeatmapView.tsx`
- `src/screens/StatsScreen.tsx`

---

## 프로젝트 구조

```
worktimer-expo/
├── app.json                    # Expo 설정 (plugins 포함)
├── eas.json                    # EAS Build 설정
├── src/
│   ├── lib/
│   │   ├── dateUtils.ts        # 날짜 유틸리티 (타임존 대응)
│   │   ├── liveActivity.ts     # Live Activity 래퍼
│   │   ├── notifications.ts    # 알림 스케줄링
│   │   └── session.ts          # 세션 CRUD
│   ├── screens/
│   │   ├── TimerScreen.tsx     # 메인 타이머
│   │   ├── HistoryScreen.tsx   # 기록 탭 (탭 네비게이터)
│   │   ├── StatsScreen.tsx     # 통계
│   │   ├── SettingsScreen.tsx  # 설정
│   │   └── history/
│   │       ├── CalendarView.tsx   # 달력 뷰
│   │       └── HeatmapView.tsx    # 히트맵 뷰
│   └── types/
│       └── session.ts          # 타입 정의
├── lib/
│   └── supabase.ts             # Supabase 클라이언트
└── docs/
    ├── LIVE_ACTIVITY_IMPLEMENTATION.md
    └── IMPLEMENTATION_SUMMARY.md (이 문서)
```

---

## 빌드 방법

### 개발 서버
```bash
npx expo start --dev-client
```

### iOS 빌드 (xcodebuild)
```bash
# Prebuild
npx expo prebuild --platform ios --clean

# Archive
cd ios
xcodebuild -workspace worktimerexpo.xcworkspace \
  -scheme worktimerexpo \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=9Q26686S8R \
  archive -archivePath ./build-signed/worktimer.xcarchive

# Export IPA
xcodebuild -exportArchive \
  -archivePath ./build-signed/worktimer.xcarchive \
  -exportPath ./build-signed/export \
  -exportOptionsPlist ./ExportOptions.plist \
  -allowProvisioningUpdates

# 기기 설치
xcrun devicectl device install app --device <DEVICE_ID> ./build-signed/export/worktimerexpo.ipa
```

---

## 요구사항

- iOS 16.2+ (Live Activity)
- Expo SDK 51+
- Node.js 18+
- Apple Developer 계정

---

## 참고 자료

- [expo-live-activity GitHub](https://github.com/software-mansion-labs/expo-live-activity)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
