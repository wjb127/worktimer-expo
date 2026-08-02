// 웹(=Tauri 데스크탑) 번들 전용 expo-notifications 셰임 —
// metro.config.js가 web 플랫폼에서만 갈아끼운다.
//
// expo-notifications는 웹에서 대부분의 메서드가 "not available on web"으로 **throw** 한다.
// 앱은 세션 종료 흐름에서 예약 알림을 재계산하므로, 그냥 두면 종료 버튼이 먹통이 된다
// (실측: 타이머가 계속 돌고 종료가 안 됨).
//
// 데스크탑 알림은 Tauri 쪽 트레이 앱이 idle 알림으로 이미 담당한다. 여기서는
// "조용히 아무 일도 하지 않는다"가 맞는 동작이라 no-op + 빈 배열로 둔다.

export type NotificationRequest = {
  identifier: string;
  content: { title?: string | null; body?: string | null; data?: unknown };
  trigger: unknown;
};

export const AndroidImportance = {
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
} as const;

export const SchedulableTriggerInputTypes = {
  DATE: 'date',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  YEARLY: 'yearly',
  TIME_INTERVAL: 'timeInterval',
} as const;

export function setNotificationHandler(_handler: unknown): void {}

export async function getPermissionsAsync() {
  return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
}

export async function requestPermissionsAsync() {
  return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
}

export async function getAllScheduledNotificationsAsync(): Promise<NotificationRequest[]> {
  return [];
}

export async function getPresentedNotificationsAsync(): Promise<unknown[]> {
  return [];
}

export async function scheduleNotificationAsync(_req: unknown): Promise<string> {
  return '';
}

export async function cancelScheduledNotificationAsync(_id: string): Promise<void> {}

export async function setNotificationChannelAsync(
  _channelId: string,
  _channel: unknown,
): Promise<null> {
  return null;
}

export async function getExpoPushTokenAsync(): Promise<{ data: string; type: string }> {
  // 푸시 토큰은 데스크탑에 없다. 호출부가 문자열을 기대하므로 형태만 맞춘다.
  return { data: '', type: 'expo' };
}

// 리스너는 구독 객체(remove 가능)를 돌려줘야 언마운트에서 안 터진다.
const noopSubscription = { remove(): void {} };

export function addNotificationReceivedListener(_l: unknown) {
  return noopSubscription;
}

export function addNotificationResponseReceivedListener(_l: unknown) {
  return noopSubscription;
}
