import * as Sentry from '@sentry/react-native';

// Sentry 얇은 래퍼 — 크래시/에러 트래킹.
// 핵심 원칙: DSN이 없거나 초기화/전송이 실패해도 앱을 절대 크래시/블로킹하지 않는다.
// 모든 Sentry 호출은 try/catch로 감싼다. (analytics.ts와 동일한 shape/스타일)

let initialized = false; // initErrorTracking 멱등 보장
let enabled = false; // DSN 없음/초기화 실패 → 완전 no-op

// 환경변수는 런타임에 읽는다 (테스트에서 주입 가능하도록 함수 내부에서 접근).
function readDsn(): string {
  return (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
}

// 여러 번 호출해도 안전 (멱등). DSN이 없으면 조용히 비활성.
export function initErrorTracking(): void {
  if (initialized) return;
  initialized = true;

  const dsn = readDsn();
  if (!dsn) {
    // 스팸 로그 방지 — 초기화 시 최대 1회만 남긴다.
    console.log('[errorTracking] disabled (no Sentry DSN)');
    return;
  }

  try {
    Sentry.init({
      dsn,
      enableNative: true,
      tracesSampleRate: 0, // 성능 트레이싱 미사용
      debug: false,
    });
    enabled = true;
  } catch {
    // 초기화 실패해도 앱은 계속 동작 (이후 모든 호출 no-op).
    enabled = false;
  }
}

// 초기화 전/DSN 없음이면 no-op. 절대 예외를 밖으로 던지지 않는다.
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled) return;
  try {
    if (context) {
      Sentry.captureException(error, { extra: context });
    } else {
      Sentry.captureException(error);
    }
  } catch {
    // 에러 트래킹은 앱 흐름을 절대 막지 않는다.
  }
}
