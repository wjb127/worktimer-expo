import * as Updates from 'expo-updates';

// OTA 자동 다운로드 — 최신 업데이트는 받아두고 다음 콜드스타트에 적용한다.
// 실행 중 즉시 리로드하면 타이머·AI 스트리밍·작성 중 모달을 끊을 수 있으므로
// reloadAsync는 호출하지 않는다. dev/Expo Go/미지원 환경은 no-op.

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
    }
  } catch {
    // 조용히 무시 — 앱 동작을 절대 막지 않는다
  } finally {
    inFlight = false;
  }
}
