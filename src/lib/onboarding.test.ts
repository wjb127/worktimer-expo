// AsyncStorage 인메모리 모킹 (RN 프리셋 없이 인라인). getItem/setItem을
// jest.fn으로 두어 reject 케이스도 개별 테스트에서 덮어쓸 수 있게 한다.
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

import {
  ONBOARDING_SEEN_KEY,
  getOnboardingSeen,
  markOnboardingSeen,
} from './onboarding';

describe('onboarding', () => {
  beforeEach(() => {
    Object.keys(mem).forEach((k) => delete mem[k]);
    mockGetItem.mockClear();
    mockSetItem.mockClear();
    mockGetItem.mockImplementation((k: string) => Promise.resolve(mem[k] ?? null));
  });

  it('저장값이 없으면 false를 반환한다', async () => {
    expect(await getOnboardingSeen()).toBe(false);
  });

  it("저장값이 '1'이면 true를 반환한다", async () => {
    mem[ONBOARDING_SEEN_KEY] = '1';
    expect(await getOnboardingSeen()).toBe(true);
  });

  it("markOnboardingSeen은 키에 '1'을 기록한다", async () => {
    await markOnboardingSeen();
    expect(mockSetItem).toHaveBeenCalledWith(ONBOARDING_SEEN_KEY, '1');
    expect(mem[ONBOARDING_SEEN_KEY]).toBe('1');
  });

  it('getItem이 실패해도 예외 없이 false를 반환한다', async () => {
    mockGetItem.mockImplementation(() => Promise.reject(new Error('boom')));
    await expect(getOnboardingSeen()).resolves.toBe(false);
  });
});
