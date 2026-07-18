import * as Updates from 'expo-updates';

// OTA 자동 적용 — 앱이 켜질 때/포그라운드 복귀 때 최신 업데이트가 있으면
// 받아서 즉시 리로드한다. 그러면 "2번 재실행" 없이 한 번 켜면 최신이 적용됨.
// dev/Expo Go/미지원 환경은 no-op. 네트워크 등 실패는 조용히 무시(다음 기회에).

let inFlight = false;

export async function checkAndApplyUpdate(): Promise<void> {
  // 개발 빌드/Metro/미지원 환경에선 Updates가 비활성 → 아무것도 안 함
  if (__DEV__ || !Updates.isEnabled) return;
  if (inFlight) return;
  inFlight = true;
  try {
    const res = await Updates.checkForUpdateAsync();
    if (res.isAvailable) {
      await Updates.fetchUpdateAsync();
      // 새 번들로 즉시 재시작 (콜드런치면 매끄럽고, 복귀면 잠깐 깜빡)
      await Updates.reloadAsync();
    }
  } catch {
    // 조용히 무시 — 앱 동작을 절대 막지 않는다
  } finally {
    inFlight = false;
  }
}
