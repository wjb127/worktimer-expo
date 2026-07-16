// 프리미엄 판정 3단 폴백 테스트 — 로컬 체험 > RC > 서버, 전부 실패 시 false.
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: mockGetItem, setItem: mockSetItem },
}));

const mockHasPremium = jest.fn();
jest.mock('./purchases', () => ({ hasPremium: mockHasPremium }));

const mockGetSub = jest.fn();
jest.mock('./api/profile', () => ({ apiGetSubscription: mockGetSub }));

// usePremium(react hook)은 화면 통합 영역 — 여기선 순수 로직만 검증
describe('premium', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockHasPremium.mockResolvedValue(false);
    mockGetSub.mockRejectedValue(new Error('network'));
  });

  it('로컬 체험 언락이 있으면 RC/서버 안 보고 true', async () => {
    mockGetItem.mockResolvedValue('1');
    const { getPremiumStatus } = require('./premium');
    await expect(getPremiumStatus()).resolves.toBe(true);
    expect(mockHasPremium).not.toHaveBeenCalled();
  });

  it('RC entitlement가 있으면 true (서버 안 감)', async () => {
    mockHasPremium.mockResolvedValue(true);
    const { getPremiumStatus } = require('./premium');
    await expect(getPremiumStatus()).resolves.toBe(true);
    expect(mockGetSub).not.toHaveBeenCalled();
  });

  it('서버 구독이 isPremium이면 true', async () => {
    mockGetSub.mockResolvedValue({ status: 'active', isPremium: true });
    const { getPremiumStatus } = require('./premium');
    await expect(getPremiumStatus()).resolves.toBe(true);
  });

  it('전부 아니면 false (서버 실패 포함, throw 없음)', async () => {
    const { getPremiumStatus } = require('./premium');
    await expect(getPremiumStatus()).resolves.toBe(false);
  });

  it('startLocalTrial은 저장 실패해도 throw하지 않는다', async () => {
    mockSetItem.mockRejectedValue(new Error('disk'));
    const { startLocalTrial } = require('./premium');
    await expect(startLocalTrial()).resolves.toBeUndefined();
  });
});
