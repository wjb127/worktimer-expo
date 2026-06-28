import { apiJson } from './client';

// 서버에서 내려주는 배너/공지. kind 별로 스타일이 달라진다.
export interface Banner {
  id: string;
  kind: 'info' | 'notice' | 'event';
  title: string;
  body: string | null;
  actionUrl: string | null;
  priority: number;
}

// 활성 배너 목록을 가져온다 (우선순위 높은 순). 배너는 비핵심 기능이라
// 어떤 실패에도 throw 하지 않고 빈 배열을 반환해 홈 화면을 보호한다.
export async function apiGetBanners(appVersion = '1.0.0'): Promise<Banner[]> {
  try {
    const data = await apiJson<Banner[]>(
      `/config/banners?app=worktimer&appVersion=${encodeURIComponent(appVersion)}`,
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
