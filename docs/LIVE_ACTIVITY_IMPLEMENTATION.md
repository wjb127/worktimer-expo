# Live Activity 구현 완료 문서

## 개요
WorkTimer 앱에 iOS Live Activity 기능을 추가하여 잠금화면과 Dynamic Island에서 실시간 업무 시간을 확인할 수 있도록 구현 완료.

## 구현 일자
2024년 11월 30일

---

## 사용 라이브러리

### expo-live-activity
- **GitHub**: https://github.com/software-mansion-labs/expo-live-activity
- **개발사**: Software Mansion Labs
- **버전**: 최신

### 주요 특징
- Expo와 완벽 통합
- Config Plugin으로 자동 설정
- 프리빌트 UI 제공 (Swift 코드 불필요)
- iOS 16.2+ 지원

---

## 파일 구조

```
worktimer-expo/
├── app.json                    # expo-live-activity 플러그인 등록
├── package.json                # expo-live-activity 의존성
├── src/
│   └── lib/
│       └── liveActivity.ts     # Live Activity 래퍼 함수
├── ios/
│   └── LiveActivity/           # 자동 생성된 Widget Extension
│       ├── LiveActivityView.swift
│       ├── LiveActivityWidget.swift
│       └── ...
└── plugins/
    └── withLiveActivity.js     # (기존 커스텀 플러그인 - 미사용)
```

---

## 설정 파일

### app.json
```json
{
  "expo": {
    "plugins": [
      "expo-live-activity"
    ]
  }
}
```

### 자동 추가되는 iOS 설정
- `NSSupportsLiveActivities: true` (Info.plist)
- LiveActivity Widget Extension target
- 필요한 entitlements

---

## 핵심 코드

### src/lib/liveActivity.ts

```typescript
import * as LiveActivity from 'expo-live-activity';
import { Platform } from 'react-native';

let currentActivityId: string | null = null;

// 시간 포맷팅
const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Live Activity 시작
export async function startLiveActivity(
  startTime: Date,
  todayTotal: number
): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;

  const state = {
    title: '업무 중',
    subtitle: `오늘 총: ${formatTime(todayTotal)}`,
    progressBar: { date: startTime.getTime() },
  };

  const config = {
    backgroundColor: '#1C1C1E',
    titleColor: '#FFFFFF',
    subtitleColor: '#8E8E93',
    progressViewTint: '#34C759',
    timerType: 'digital' as const,
  };

  const activityId = LiveActivity.startActivity(state, config);
  currentActivityId = activityId ?? null;
  return activityId ?? null;
}

// Live Activity 업데이트
export async function updateLiveActivity(
  elapsedSeconds: number,
  todayTotal: number
): Promise<boolean> {
  if (Platform.OS !== 'ios' || !currentActivityId) return false;

  const state = {
    title: '업무 중',
    subtitle: `오늘 총: ${formatTime(todayTotal + elapsedSeconds)}`,
    progressBar: { progress: (elapsedSeconds % 3600) / 3600 },
  };

  LiveActivity.updateActivity(currentActivityId, state);
  return true;
}

// Live Activity 종료
export async function endLiveActivity(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !currentActivityId) return false;

  const finalState = {
    title: '업무 종료',
    subtitle: '수고하셨습니다',
  };
  LiveActivity.stopActivity(currentActivityId, finalState);
  currentActivityId = null;
  return true;
}
```

---

## TimerScreen 연동

### src/screens/TimerScreen.tsx

```typescript
import {
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
  isLiveActivityRunning,
} from '../lib/liveActivity';

// 타이머 시작 시
const handleStart = async () => {
  const session = await startSession();
  if (session) {
    await startLiveActivity(new Date(session.start_time), todayTotal);
  }
};

// 10초마다 업데이트
useEffect(() => {
  if (isRunning && elapsedSeconds % 10 === 0) {
    updateLiveActivity(elapsedSeconds, todayTotal);
  }
}, [isRunning, elapsedSeconds, todayTotal]);

// 타이머 종료 시
const handleStop = async () => {
  await endSession(currentSession.id, elapsedSeconds);
  await endLiveActivity();
};
```

---

## 빌드 방법

### 1. Prebuild
```bash
npx expo prebuild --platform ios --clean
```

### 2. Xcode 빌드 (로컬)
```bash
cd ios
xcodebuild -workspace worktimerexpo.xcworkspace \
  -scheme worktimerexpo \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=9Q26686S8R \
  archive -archivePath ./build-signed/worktimer.xcarchive
```

### 3. IPA 생성
```bash
xcodebuild -exportArchive \
  -archivePath ./build-signed/worktimer.xcarchive \
  -exportPath ./build-signed/export \
  -exportOptionsPlist ./ExportOptions.plist \
  -allowProvisioningUpdates
```

### 4. 기기 설치
```bash
xcrun devicectl device install app --device <DEVICE_ID> ./build-signed/export/worktimerexpo.ipa
```

---

## API 참고사항

### expo-live-activity API

| 함수 | 설명 |
|------|------|
| `startActivity(state, config)` | Live Activity 시작, ID 반환 |
| `updateActivity(id, state)` | 상태 업데이트 |
| `stopActivity(id, state)` | 종료 (state 필수!) |

### State 객체
```typescript
{
  title: string;           // 제목
  subtitle?: string;       // 부제목
  progressBar?: {
    date?: number;         // 타이머 시작 시간 (ms)
    progress?: number;     // 진행률 (0-1)
  };
}
```

### Config 객체
```typescript
{
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  progressViewTint?: string;      // ⚠️ progressBarColor 아님!
  timerType?: 'circular' | 'digital';  // ⚠️ 'countUp' 없음!
}
```

---

## 트러블슈팅

### 1. Live Activity가 안 나타나는 경우
- 설정 → 앱 → WorkTimer → **Live Activities 허용** 확인
- iOS 16.2 이상인지 확인

### 2. stopActivity 오류
```typescript
// ❌ 잘못된 사용
LiveActivity.stopActivity(id);

// ✅ 올바른 사용 (state 필수)
LiveActivity.stopActivity(id, { title: '종료', subtitle: '완료' });
```

### 3. EAS 빌드 시 credentials 오류
- LiveActivity target에 별도 Provisioning Profile 필요
- Interactive 모드로 빌드: `eas build --profile preview --platform ios`

---

## 요구사항

- iOS 16.2+
- Expo SDK 51+
- 실제 기기 (시뮬레이터 미지원)
- Apple Developer 계정

---

## 백업 위치

```
~/Desktop/worktimer-backup-YYYYMMDD-HHMMSS/
```

---

## 참고 자료

- [expo-live-activity GitHub](https://github.com/software-mansion-labs/expo-live-activity)
- [Inkitt Tech - Live Activity in Expo](https://medium.com/inkitt-tech/live-activity-widget-in-expo-react-native-project-607df51f8a15)
- [Apple ActivityKit Documentation](https://developer.apple.com/documentation/activitykit)
