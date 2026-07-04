// reviewPrompt 게이팅 로직 단위 테스트.
// expo-store-review / AsyncStorage / analytics.track 를 인라인 모킹하고,
// resetModules + require 로 매 테스트마다 신선한 모듈 상태로 검증한다.
// (analytics.test.ts / onboarding.test.ts 와 동일한 shape/스타일)

// AsyncStorage 인메모리 모킹 — 안정 참조를 밖에 두고 각 테스트에서 seed/reject 가능.
const mem: Record<string, string> = {};
const mockGetItem = jest.fn((k: string) => Promise.resolve(mem[k] ?? null));
const mockSetItem = jest.fn((k: string, v: string) => {
  mem[k] = v;
  return Promise.resolve();
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => mockGetItem(k),
    setItem: (k: string, v: string) => mockSetItem(k, v),
  },
}));

// expo-store-review 모킹.
const mockIsAvailable = jest.fn();
const mockRequestReview = jest.fn();
jest.mock('expo-store-review', () => ({
  isAvailableAsync: () => mockIsAvailable(),
  requestReview: () => mockRequestReview(),
}));

// analytics.track 스파이.
const mockTrack = jest.fn();
jest.mock('./analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

// 매 테스트마다 신선하게 require (resetModules 후) 하기 위한 헬퍼.
function load() {
  return require('./reviewPrompt') as typeof import('./reviewPrompt');
}

describe('reviewPrompt', () => {
  beforeEach(() => {
    jest.resetModules();
    Object.keys(mem).forEach((k) => delete mem[k]);
    mockGetItem.mockClear();
    mockSetItem.mockClear();
    mockIsAvailable.mockReset();
    mockRequestReview.mockReset();
    mockTrack.mockReset();
    // 기본: 리뷰 가능 + 요청 정상.
    mockIsAvailable.mockResolvedValue(true);
    mockRequestReview.mockResolvedValue(undefined);
    mockGetItem.mockImplementation((k: string) => Promise.resolve(mem[k] ?? null));
  });

  it('isAvailableAsync 가 false 면 아무것도 하지 않는다 (요청/계측/예외 없음)', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { maybeRequestReview } = load();
    await expect(maybeRequestReview()).resolves.toBeUndefined();
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('첫 호출은 기쁨 카운트를 1로 올리지만 (MIN 미만) 요청/계측하지 않는다', async () => {
    const { maybeRequestReview, DELIGHT_COUNT_KEY } = load();
    await maybeRequestReview();
    expect(mem[DELIGHT_COUNT_KEY]).toBe('1');
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('두 번째 자격 호출(기쁨 2 도달, 이전 요청/쿨다운 없음)에 track + requestReview 하고 상태를 저장한다', async () => {
    const { maybeRequestReview, DELIGHT_COUNT_KEY, PROMPT_COUNT_KEY, PROMPT_LAST_AT_KEY } = load();
    mem[DELIGHT_COUNT_KEY] = '1'; // 이전에 1회 기쁨 카운트됨
    await maybeRequestReview();
    expect(mem[DELIGHT_COUNT_KEY]).toBe('2');
    expect(mockTrack).toHaveBeenCalledWith('review_prompt_shown');
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(mem[PROMPT_COUNT_KEY]).toBe('1');
    // last_at 이 최근 타임스탬프로 기록됨.
    expect(Number(mem[PROMPT_LAST_AT_KEY])).toBeGreaterThan(0);
  });

  it('쿨다운 기간 이내면 requestReview 하지 않는다', async () => {
    const { maybeRequestReview, DELIGHT_COUNT_KEY, PROMPT_COUNT_KEY, PROMPT_LAST_AT_KEY } = load();
    mem[DELIGHT_COUNT_KEY] = '2'; // 이미 MIN 이상
    mem[PROMPT_COUNT_KEY] = '1'; // 이전에 1회 요청됨
    mem[PROMPT_LAST_AT_KEY] = String(Date.now()); // 방금 요청 → 쿨다운 중
    await maybeRequestReview();
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('최대 요청 횟수에 도달하면 requestReview 하지 않는다', async () => {
    const { maybeRequestReview, DELIGHT_COUNT_KEY, PROMPT_COUNT_KEY, MAX_PROMPTS } = load();
    mem[DELIGHT_COUNT_KEY] = '2';
    mem[PROMPT_COUNT_KEY] = String(MAX_PROMPTS); // 평생 한도 도달
    await maybeRequestReview();
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('requestReview 가 reject 해도 maybeRequestReview 는 예외를 던지지 않는다', async () => {
    mockRequestReview.mockRejectedValue(new Error('boom'));
    const { maybeRequestReview, DELIGHT_COUNT_KEY } = load();
    mem[DELIGHT_COUNT_KEY] = '1'; // 이번 호출로 2 도달 → 요청 시도
    await expect(maybeRequestReview()).resolves.toBeUndefined();
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });
});
