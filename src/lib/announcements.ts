import { Linking } from 'react-native';

// 공지 읽음 상태 공유 저장소 (세션 스코프, 모듈 레벨).
// AnnouncementBell(헤더 배지)과 NotificationsScreen(알림 모음 페이지)이 같은 상태를 본다.
const readIds = new Set<string>();
const listeners = new Set<() => void>();

export function isBannerRead(id: string): boolean {
  return readIds.has(id);
}

// 읽음 처리 — 실제로 새로 읽힌 게 있을 때만 구독자에게 알림(배지 재계산)
export function markBannersRead(ids: string[]): void {
  let changed = false;
  for (const id of ids) {
    if (!readIds.has(id)) {
      readIds.add(id);
      changed = true;
    }
  }
  if (changed) listeners.forEach((l) => l());
}

export function subscribeReadChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// 테스트 전용 — 세션 읽음 상태 초기화
export function resetReadStateForTest(): void {
  readIds.clear();
  listeners.clear();
}

// SDUI 신뢰경계: 서버 URL은 안전 스킴만 오픈 (백엔드 탈취 시 악성 딥링크 차단)
const ALLOWED_URL_SCHEMES = ['https:', 'mailto:', 'tel:'];
export const isSafeActionUrl = (
  url: string | null | undefined,
): url is string => {
  if (!url) return false;
  const colon = url.indexOf(':');
  if (colon < 0) return false;
  return ALLOWED_URL_SCHEMES.includes(url.slice(0, colon + 1).toLowerCase());
};

export async function openActionUrl(
  url: string | null | undefined,
): Promise<void> {
  if (!isSafeActionUrl(url)) return;
  try {
    await Linking.openURL(url);
  } catch {
    // 잘못된 url 등은 조용히 무시
  }
}
