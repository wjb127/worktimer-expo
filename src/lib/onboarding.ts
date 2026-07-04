import AsyncStorage from '@react-native-async-storage/async-storage';

// 첫 실행 온보딩 노출 여부 저장 키 (한 번 보면 다시 안 뜸).
export const ONBOARDING_SEEN_KEY = 'onboarding_seen_v1';

// 온보딩을 이미 봤는지 여부. 저장값이 '1'일 때만 true.
// 저장 조회 실패 시 false 반환 → 크래시 대신 온보딩을 다시 노출(안전).
export async function getOnboardingSeen(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

// 온보딩을 봤다고 기록. 저장 실패는 조용히 무시(앱 흐름을 막지 않음).
export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
  } catch {
    // 무시
  }
}
