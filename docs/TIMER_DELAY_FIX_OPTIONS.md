# 타이머 탭 전환 딜레이 해결 방안

## 현재 문제

`TimerScreen.tsx`의 `loadData()` 함수에서 탭 전환 시 다음 작업들이 **순차적으로 await** 되어 딜레이 발생:

```
1. Supabase 쿼리 (병렬) ──────────────┐
2. requestNotificationPermissions()   │ 모두 완료 후
3. scheduleHourlyWorkNotifications()  │ setLoading(false)
4. isLiveActivityRunning()            │
5. updateLiveActivity()  ─────────────┘
```

---

## 해결 방안

### 방안 1: 로딩 분리 (UI 우선 표시)

**원리**: Supabase 데이터만 받으면 바로 UI 표시, 알림/Live Activity는 백그라운드에서 처리

**변경 내용**:
- Supabase 쿼리 완료 직후 `setLoading(false)` 호출
- 알림/Live Activity 작업은 await 없이 비동기 실행

**장점**:
- 가장 단순한 변경
- 체감 속도 대폭 개선

**단점**:
- 알림/Live Activity 오류 시 사용자에게 피드백 없음

**난이도**: ⭐ (쉬움)

---

### 방안 2: 알림/Live Activity 작업 병렬화

**원리**: 순차 실행 중인 작업들을 `Promise.all`로 병렬 처리

**변경 내용**:
```javascript
// Before
await requestNotificationPermissions();
await scheduleHourlyWorkNotifications(elapsed);
await isLiveActivityRunning();

// After
await Promise.all([
  requestNotificationPermissions().then(() => scheduleHourlyWorkNotifications(elapsed)),
  isLiveActivityRunning().then(running => !running && startLiveActivity(...)),
]);
```

**장점**:
- 기존 로직 유지하면서 속도 개선

**단점**:
- 여전히 전체 완료까지 로딩 표시

**난이도**: ⭐⭐ (보통)

---

### 방안 3: 알림 스케줄링 최적화

**원리**: 100개 알림을 개별 스케줄 → 배치 처리 또는 필요한 만큼만 스케줄

**변경 내용**:
- `scheduleIntervalWorkNotifications()`에서 처음 10개만 스케줄
- 앱 사용 중 추가 스케줄 (lazy loading)

**장점**:
- 알림 스케줄링 시간 90% 감소

**단점**:
- 앱 미사용 시 알림 누락 가능성
- 로직 복잡도 증가

**난이도**: ⭐⭐⭐ (어려움)

---

### 방안 4: useFocusEffect에서 불필요한 재실행 방지

**원리**: 이미 데이터가 있으면 탭 전환 시 재로딩 스킵

**변경 내용**:
```javascript
useFocusEffect(
  useCallback(() => {
    // 이미 로드된 상태면 스킵 (또는 silent refresh)
    if (currentSession !== null || !loading) {
      // 백그라운드에서만 동기화
      return;
    }
    loadData();
  }, [])
);
```

**장점**:
- 탭 전환 시 깜빡임 완전 제거

**단점**:
- 다른 화면에서 세션 변경 시 반영 안됨
- 추가적인 동기화 로직 필요

**난이도**: ⭐⭐ (보통)

---

### 방안 5: 로딩 스피너 제거 + Skeleton UI

**원리**: 전체 화면 로딩 대신 이전 상태 유지하며 백그라운드 갱신

**변경 내용**:
- `loading` 상태를 첫 로드에만 사용
- 이후 탭 전환 시에는 기존 UI 유지 + 조용히 갱신

**장점**:
- UX 개선 (화면 깜빡임 없음)
- 네트워크 느려도 사용 가능

**단점**:
- 일시적으로 stale 데이터 표시

**난이도**: ⭐⭐ (보통)

---

## 추천안

### 🏆 **방안 1 + 방안 5 조합** (추천)

```
[첫 로드]
- 로딩 스피너 표시
- 모든 작업 완료 후 UI 표시

[탭 전환 (재방문)]
- 기존 UI 그대로 유지
- 백그라운드에서 Supabase 데이터 갱신
- 알림/Live Activity는 fire-and-forget
```

**이유**:
1. **체감 속도**: 탭 전환 시 즉시 응답
2. **구현 단순**: 기존 코드 최소 변경
3. **안정성**: 첫 로드는 확실히 처리, 이후는 UX 우선

---

## 빠른 선택 가이드

| 상황 | 추천 방안 |
|------|----------|
| 최소 변경으로 빠르게 개선 | 방안 1 |
| 깜빡임 완전 제거 원함 | 방안 5 |
| 둘 다 원함 (최적) | 방안 1 + 5 조합 |
| 알림 자체가 느린 게 문제 | 방안 3 추가 |

---

## 예상 효과

| 방안 | 현재 → 개선 후 |
|------|---------------|
| 방안 1 | ~500ms → ~100ms |
| 방안 5 | ~500ms → ~0ms (재방문) |
| 조합 | 첫 로드 ~300ms, 재방문 ~0ms |

*수치는 예상치이며 네트워크/기기 상태에 따라 다름*
