# WorkTimer 위젯 구현 방안 분석

## 요구사항
- 앱을 닫아도 현재 업무량을 상시 확인 가능
- 실시간 또는 준실시간 업무 시간 추적
- 홈 화면, 잠금 화면 등에서 빠르게 확인

---

## 구현 방안 비교

| 방안 | 플랫폼 | 실시간성 | 구현 난이도 | Expo 호환성 | 추천도 |
|------|--------|----------|-------------|-------------|--------|
| 1. iOS 홈 위젯 | iOS | 15분 간격 | 높음 | 낮음 | ★★★☆☆ |
| 2. Live Activities | iOS | 실시간 | 중간 | 낮음 | ★★★★★ |
| 3. Android 위젯 | Android | 30분 간격 | 높음 | 낮음 | ★★☆☆☆ |
| 4. 지속적 알림 | 둘 다 | 실시간 | 낮음 | 높음 | ★★★★☆ |
| 5. Apple Watch | iOS | 실시간 | 높음 | 낮음 | ★★☆☆☆ |
| 6. 잠금화면 위젯 | iOS 16+ | 15분 간격 | 높음 | 낮음 | ★★★☆☆ |

---

## 방안 1: iOS 홈 화면 위젯 (WidgetKit)

### 설명
iOS 14+에서 지원하는 홈 화면 위젯. Swift로 별도 위젯 Extension 개발 필요.

### 장점
- 홈 화면에서 항상 보임
- 사용자에게 익숙한 UX
- 다양한 크기 지원 (Small/Medium/Large)

### 단점
- **업데이트 주기 제한: 최소 15분** (iOS 시스템 제한)
- Swift/Xcode 필수 - Expo managed workflow 탈출 필요
- 앱과 위젯 간 데이터 공유를 위해 App Groups 설정 필요
- 실시간 타이머 표시 불가 (1초 단위 업데이트 안됨)

### 구현 방법
```
1. expo prebuild로 native 프로젝트 생성
2. Xcode에서 Widget Extension 추가
3. App Groups 설정 (데이터 공유용)
4. SwiftUI로 위젯 UI 구현
5. react-native-shared-group-preferences로 RN↔Widget 데이터 공유
```

### 필요 라이브러리
- `react-native-shared-group-preferences` 또는 `react-native-widget-bridge`
- expo-dev-client (development build 필수)

### 예상 개발 시간
2-3일 (Swift 경험 있는 경우)

---

## 방안 2: Live Activities (Dynamic Island) ⭐ 추천

### 설명
iOS 16.1+에서 지원. 잠금화면과 Dynamic Island에 실시간 업데이트 표시.
**업무 타이머와 같은 "진행 중인 활동"에 최적화된 기능.**

### 장점
- **진짜 실시간 업데이트 가능** (1초 단위 타이머 표시!)
- 잠금화면에서도 확인 가능
- Dynamic Island 지원 기기에서 눈에 잘 띔
- 배달앱, 스포츠 중계, 타이머 등에서 널리 사용됨
- **업무 시작할 때만 활성화, 종료하면 자동 해제**

### 단점
- iOS 16.1+ 필요 (iPhone 14 Pro 이상에서 Dynamic Island)
- Swift/Xcode 필수
- expo managed workflow 탈출 필요
- Android 미지원

### 구현 방법
```
1. expo prebuild로 native 프로젝트 생성
2. Xcode에서 Widget Extension + Live Activity 추가
3. ActivityKit으로 Live Activity 시작/업데이트/종료
4. React Native에서 Native Module로 제어
```

### 예시 UI
```
┌─────────────────────────────────┐
│  🟢 업무 중     02:34:15       │  ← 잠금화면
│  오늘 총 5시간 32분            │
└─────────────────────────────────┘

    ⏱️ 02:34:15                    ← Dynamic Island (확장)
```

### 필요 라이브러리
- `react-native-live-activity` 또는 직접 Native Module 구현
- expo-dev-client

### 예상 개발 시간
3-4일

---

## 방안 3: Android 홈 화면 위젯

### 설명
Android의 AppWidget을 사용한 홈 화면 위젯.

### 장점
- Android 사용자에게 익숙
- 다양한 크기와 형태 가능

### 단점
- **업데이트 주기 제한: 최소 30분** (배터리 최적화)
- Java/Kotlin + Android Studio 필요
- 실시간 타이머 표시 불가
- Expo managed workflow 탈출 필요

### 구현 방법
```
1. expo prebuild
2. Android Studio에서 AppWidgetProvider 구현
3. SharedPreferences로 데이터 공유
4. RemoteViews로 위젯 UI 구현
```

### 예상 개발 시간
2-3일

---

## 방안 4: 지속적 알림 (Persistent Notification) ⭐ 추천

### 설명
앱이 백그라운드에서 실행 중일 때 상단 알림바에 항상 표시되는 알림.
Foreground Service (Android) / Background Task (iOS)와 함께 사용.

### 장점
- **Expo 호환! managed workflow 유지 가능**
- **실시간 업데이트 가능** (1초마다 가능)
- 구현이 상대적으로 간단
- Android/iOS 둘 다 지원
- 알림을 탭하면 바로 앱 열기 가능

### 단점
- 알림바를 내려야 확인 가능 (위젯보다 가시성 낮음)
- 사용자가 알림을 끌 수 있음
- iOS에서는 Background App Refresh 설정 필요
- 배터리 소모 증가 가능

### 구현 방법 (Expo)
```typescript
// expo-notifications의 ongoing notification 사용
await Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.LOW,
  }),
});

// Android: 지속적 알림
await Notifications.scheduleNotificationAsync({
  content: {
    title: '업무 중 ⏱️',
    body: '경과 시간: 02:34:15',
    sticky: true,  // Android에서 스와이프해도 안 사라짐
    ongoing: true, // 지속적 알림
  },
  trigger: null, // 즉시 표시
  identifier: 'work-timer',
});
```

### 필요 라이브러리
- `expo-notifications` (이미 설치됨!)
- `expo-task-manager` (백그라운드 업데이트용)
- `expo-background-fetch`

### 예상 개발 시간
1-2일

---

## 방안 5: Apple Watch 컴플리케이션

### 설명
Apple Watch 워치페이스에 작은 위젯 형태로 표시.

### 장점
- 손목만 들어도 바로 확인
- 항상 표시됨

### 단점
- Apple Watch 필요
- watchOS 앱 별도 개발 (Swift 필수)
- Expo 완전 탈출 필요
- 복잡한 설정

### 예상 개발 시간
5-7일

---

## 방안 6: iOS 잠금화면 위젯 (iOS 16+)

### 설명
iOS 16에서 추가된 잠금화면 위젯. WidgetKit 기반.

### 장점
- 잠금화면에서 바로 확인
- 폰을 들 때마다 보임

### 단점
- iOS 16+ 필요
- 방안 1과 동일한 제한사항 (15분 간격)
- Swift 필수

### 예상 개발 시간
방안 1과 함께 구현 시 +0.5일

---

## 추천 전략

### 🥇 1순위 추천: Live Activities (방안 2)

**이유:**
- 업무 타이머는 "진행 중인 활동"이므로 Live Activities의 정확한 용도
- 실시간 1초 단위 타이머 표시 가능
- 잠금화면에서 바로 확인 가능
- Dynamic Island에서 눈에 잘 띔
- 업무 시작 시 활성화, 종료 시 자동 해제 (깔끔한 UX)

### 🥈 2순위 추천: 지속적 알림 (방안 4)

**이유:**
- Expo managed workflow 유지 가능 (개발 편의성)
- 빠르게 구현 가능 (1-2일)
- Android/iOS 둘 다 지원
- 실시간 업데이트 가능

### 🥉 3순위: Live Activities + 지속적 알림 조합

**이유:**
- iOS에서는 Live Activities로 최상의 UX
- Android에서는 지속적 알림으로 커버
- 플랫폼별 최적화

---

## 결론

| 우선순위 | 방안 | 특징 |
|----------|------|------|
| **1순위** | Live Activities | iOS 최적, 실시간, 최고의 UX |
| **2순위** | 지속적 알림 | 빠른 구현, 크로스플랫폼 |
| **3순위** | iOS 홈 위젯 | 익숙한 UX, 15분 제한 |

---

## 선택 가이드

- **"빨리 구현하고 싶다"** → 방안 4 (지속적 알림)
- **"iOS에서 최고의 UX"** → 방안 2 (Live Activities)
- **"둘 다 완벽하게"** → 방안 2 + 4 조합
- **"홈 화면에 항상 보이게"** → 방안 1 (iOS 위젯)

어떤 방안으로 진행할까요?
