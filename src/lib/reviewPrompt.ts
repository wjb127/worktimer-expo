import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { track } from './analytics';

// 인앱 리뷰 요청 — "긍정적 순간(마일스톤 축하 닫기)"에만, 빈도 제한을 두고 요청한다.
// 핵심 원칙: 절대 앱을 크래시/블로킹하지 않는다. 모든 동작은 try/catch로 감싼다.
// (analytics.ts / onboarding.ts 와 동일한 fail-safe 스타일)

// 리뷰를 요청하기 전에 필요한 최소 "기쁜 순간" 횟수.
// 갓 설치한 사용자의 아주 첫 작은 업적에는 묻지 않고, 2번째 축하 순간부터 요청.
export const MIN_DELIGHTS_BEFORE_PROMPT = 2;
// 리뷰 요청 사이 최소 간격(일). 애플 정책과 정렬.
export const COOLDOWN_DAYS = 60;
// 평생 최대 요청 횟수 (애플의 연 ~3회 정책과 정렬).
export const MAX_PROMPTS = 3;

// AsyncStorage 키 (테스트에서 참조할 수 있도록 export).
export const DELIGHT_COUNT_KEY = 'review_delight_count';
export const PROMPT_COUNT_KEY = 'review_prompt_count';
export const PROMPT_LAST_AT_KEY = 'review_prompt_last_at';

const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// 저장값을 안전하게 정수로 파싱 (없음/NaN → 0).
function toInt(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isNaN(n) ? 0 : n;
}

// 긍정적 순간에 호출 — 게이팅(빈도/횟수/기쁨 카운트)을 통과하면 리뷰를 요청한다.
// 어떤 경우에도 예외를 밖으로 던지지 않는다 (호출부는 fire-and-forget 가능).
export async function maybeRequestReview(): Promise<void> {
  try {
    // 1) 이 기기/스토어에서 리뷰 요청이 가능한지 확인 (불가 → 조용히 종료).
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    // 2) "기쁜 순간" 카운트 증가 후 저장. 아직 최소 횟수 미만이면 세기만 하고 종료.
    const delight = toInt(await AsyncStorage.getItem(DELIGHT_COUNT_KEY)) + 1;
    await AsyncStorage.setItem(DELIGHT_COUNT_KEY, String(delight));
    if (delight < MIN_DELIGHTS_BEFORE_PROMPT) return;

    // 3) 평생 최대 요청 횟수 초과 → 종료.
    const promptCount = toInt(await AsyncStorage.getItem(PROMPT_COUNT_KEY));
    if (promptCount >= MAX_PROMPTS) return;

    // 4) 쿨다운 기간 이내면 → 종료.
    const lastAt = toInt(await AsyncStorage.getItem(PROMPT_LAST_AT_KEY));
    if (Date.now() - lastAt < COOLDOWN_MS) return;

    // 5) 모든 게이트 통과 → 요청. 계측 후 상태를 먼저 기록(중복 요청 방지)하고 요청.
    track('review_prompt_shown');
    await AsyncStorage.setItem(PROMPT_LAST_AT_KEY, String(Date.now()));
    await AsyncStorage.setItem(PROMPT_COUNT_KEY, String(promptCount + 1));
    await StoreReview.requestReview();
  } catch {
    // 리뷰 요청은 앱 흐름을 절대 막지 않는다.
  }
}
