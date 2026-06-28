import { apiJson } from './client';

// GET /me 응답
export interface MeResponse {
  id: string;
  email: string | null;
  provider: string;
  appId: string;
  createdAt: string;
  settings: {
    dailyGoalSeconds: number;
    theme: string;
  };
}

// GET /me/stats 응답 (게이미피케이션 누적 요약)
export interface MeStats {
  totalSeconds: number;
  totalSessions: number;
  currentStreakDays: number;
  longestStreakDays: number;
  thisWeekSeconds: number;
  thisMonthSeconds: number;
}

// PATCH /me/settings 요청 본문
export interface UpdateSettingsBody {
  dailyGoalSeconds?: number;
  theme?: string;
}

// PATCH /me/settings 응답
export interface SettingsResponse {
  dailyGoalSeconds: number;
  theme: string;
}

export const apiGetMe = () => apiJson<MeResponse>('/me');

export const apiGetStats = () => apiJson<MeStats>('/me/stats');

export const apiUpdateSettings = (body: UpdateSettingsBody) =>
  apiJson<SettingsResponse>('/me/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
