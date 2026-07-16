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

// POST /me/push-token 요청 본문 — Expo 푸시 토큰 등록(주간 리캡 등 원격 발송용)
export interface RegisterPushTokenBody {
  token: string; // Expo push token (ExponentPushToken[...])
  platform: 'ios' | 'android';
}

export const apiGetMe = () => apiJson<MeResponse>('/me');

export const apiGetStats = () => apiJson<MeStats>('/me/stats');

export const apiUpdateSettings = (body: UpdateSettingsBody) =>
  apiJson<SettingsResponse>('/me/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// 백엔드에 Expo 푸시 토큰 저장. 엔드포인트 미구현 시 apiJson이 throw → 호출부가 삼킨다.
export const apiRegisterPushToken = (body: RegisterPushTokenBody) =>
  apiJson<{ ok: boolean }>('/me/push-token', {
    method: 'POST',
    body: JSON.stringify(body),
  });

// 로그아웃 시 기기 토큰 해제 (감사 2R-#7 — 로그아웃한 기기에 이전 계정 알림 방지)
export const apiUnregisterPushToken = (token: string) =>
  apiJson<{ ok: boolean }>('/me/push-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });

// GET /me/subscription — 서버측 구독 상태(RC 웹훅 진실원장)
export interface SubscriptionStatus {
  status: string; // 'none' | 'trial' | 'active' | 'cancelled' | 'expired' | 'billing_issue'
  isPremium: boolean;
  productId: string | null;
  expiresAt: string | null;
}

export const apiGetSubscription = () =>
  apiJson<SubscriptionStatus>('/me/subscription');
