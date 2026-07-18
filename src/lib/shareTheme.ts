import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SHARE_THEME,
  ShareThemeId,
  isShareThemeId,
} from '../theme/shareThemes';

// 공유 카드 테마 선택 저장 (로컬 기기 취향 — 서버 동기화 불필요).
const KEY = 'filltime.shareTheme';

export async function getShareThemeId(): Promise<ShareThemeId> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return isShareThemeId(v) ? v : DEFAULT_SHARE_THEME;
  } catch {
    return DEFAULT_SHARE_THEME;
  }
}

export async function setShareThemeId(id: ShareThemeId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {
    // 저장 실패는 조용히 무시 — 다음 실행 시 기본값
  }
}
