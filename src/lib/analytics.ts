import { PostHog } from 'posthog-react-native';

// PostHog 얇은 래퍼 — 지연 싱글턴.
// 핵심 원칙: 키가 없거나 초기화/전송이 실패해도 앱을 절대 크래시/블로킹하지 않는다.
// 모든 PostHog 호출은 try/catch로 감싸고 fire-and-forget 한다.

// 계측 이벤트 이름 (이 목록만 track에 허용).
// review_prompt_shown 은 후속 작업(인앱 리뷰)에서 사용.
export type AnalyticsEvent =
  | 'app_open'
  | 'login_success'
  | 'session_start'
  | 'session_end'
  | 'share_card_open'
  | 'share_card_shared'
  | 'share_card_copied'
  | 'share_card_saved'
  | 'milestone_achieved'
  | 'paywall_view'
  | 'purchase_start'
  | 'restore_success'
  | 'restore_none'
  | 'trial_started'
  | 'premium_interest_click'
  | 'premium_purchase_success'
  | 'onboarding_complete'
  | 'onboarding_skip'
  | 'review_prompt_shown';

const DEFAULT_HOST = 'https://us.i.posthog.com';

let client: PostHog | null = null;
let initialized = false; // initAnalytics 멱등 보장
let disabled = false; // 키 없음/초기화 실패 → 완전 no-op

// 환경변수는 런타임에 읽는다 (테스트에서 주입 가능하도록 함수 내부에서 접근).
function readKey(): string {
  return (process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '').trim();
}

function readHost(): string {
  const h = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '').trim();
  return h || DEFAULT_HOST;
}

// 여러 번 호출해도 안전 (멱등). 키가 없으면 조용히 비활성.
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  const key = readKey();
  if (!key) {
    disabled = true;
    // 스팸 로그 방지 — 초기화 시 최대 1회만 남긴다.
    console.log('[analytics] disabled (no PostHog key)');
    return;
  }

  try {
    client = new PostHog(key, { host: readHost() });
  } catch {
    // 초기화 실패해도 앱은 계속 동작 (이후 모든 호출 no-op).
    disabled = true;
    client = null;
  }
}

// 초기화 전에 호출돼도 자동 초기화 후 클라이언트를 돌려준다 (없으면 null).
function getClient(): PostHog | null {
  if (!initialized) initAnalytics();
  return disabled ? null : client;
}

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): void {
  const c = getClient();
  if (!c) return;
  try {
    c.capture(event, props);
  } catch {
    // 애널리틱스는 앱 흐름을 절대 막지 않는다.
  }
}

export function identifyUser(userId: string): void {
  const c = getClient();
  if (!c || !userId) return;
  try {
    c.identify(userId);
  } catch {
    // 무시
  }
}

// 로그아웃 시 호출 — 사용자 식별 초기화.
export function resetAnalytics(): void {
  if (!client) return;
  try {
    client.reset();
  } catch {
    // 무시
  }
}
