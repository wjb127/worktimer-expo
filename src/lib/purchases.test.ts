// RevenueCat(react-native-purchases) + react-native Platform 모킹.
// 안정 참조를 밖에 두고, default export가 이를 참조하는 객체를 반환.
const mockConfigure = jest.fn();
const mockLogIn = jest.fn();
const mockLogOut = jest.fn();
const mockGetCustomerInfo = jest.fn();
const mockGetOfferings = jest.fn();
const mockSetLogLevel = jest.fn();
const mockPurchasePackage = jest.fn();
const mockRestorePurchases = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: mockConfigure,
    logIn: mockLogIn,
    logOut: mockLogOut,
    getCustomerInfo: mockGetCustomerInfo,
    getOfferings: mockGetOfferings,
    setLogLevel: mockSetLogLevel,
    purchasePackage: mockPurchasePackage,
    restorePurchases: mockRestorePurchases,
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}));

// RN 프리셋이 없으므로 Platform만 최소 목킹(테스트는 ios로 고정).
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('purchases', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // 모듈 싱글턴(initialized/disabled) 초기화
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env = { ...OLD_ENV };
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('키가 없으면 configure를 호출하지 않는다 (스위치 OFF)', () => {
    const { initPurchases } = require('./purchases');
    expect(() => initPurchases()).not.toThrow();
    expect(mockConfigure).not.toHaveBeenCalled();
  });

  it('키가 없으면 hasPremium은 항상 false (프리미엄 오검출 방지)', async () => {
    const { hasPremium } = require('./purchases');
    await expect(hasPremium()).resolves.toBe(false);
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
  });

  it('키가 없으면 logIn/logOut은 no-op이고 예외를 던지지 않는다', async () => {
    const { logInPurchases, logOutPurchases } = require('./purchases');
    await expect(logInPurchases('user-1')).resolves.toBeUndefined();
    await expect(logOutPurchases()).resolves.toBeUndefined();
    expect(mockLogIn).not.toHaveBeenCalled();
    expect(mockLogOut).not.toHaveBeenCalled();
  });

  it('키가 있으면 configure에 iOS 키를 전달한다', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    const { initPurchases } = require('./purchases');
    initPurchases();
    expect(mockConfigure).toHaveBeenCalledWith({ apiKey: 'appl_test' });
  });

  it('initPurchases는 멱등이다 (여러 번 호출해도 configure 1회)', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    const { initPurchases } = require('./purchases');
    initPurchases();
    initPurchases();
    initPurchases();
    expect(mockConfigure).toHaveBeenCalledTimes(1);
  });

  it('키가 있으면 logIn에 userId를 전달한다', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    mockLogIn.mockResolvedValue({ customerInfo: {}, created: false });
    const { logInPurchases } = require('./purchases');
    await logInPurchases('user-42');
    expect(mockLogIn).toHaveBeenCalledWith('user-42');
  });

  it('빈 userId면 logIn을 호출하지 않는다', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    const { logInPurchases } = require('./purchases');
    await logInPurchases('');
    expect(mockLogIn).not.toHaveBeenCalled();
  });

  it('active에 premium이 있으면 hasPremium은 true', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { premium: { isActive: true } } },
    });
    const { hasPremium } = require('./purchases');
    await expect(hasPremium()).resolves.toBe(true);
  });

  it('active에 premium이 없으면 hasPremium은 false', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    mockGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });
    const { hasPremium } = require('./purchases');
    await expect(hasPremium()).resolves.toBe(false);
  });

  it('getCustomerInfo가 던져도 hasPremium은 false로 삼킨다', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    mockGetCustomerInfo.mockRejectedValue(new Error('network'));
    const { hasPremium } = require('./purchases');
    await expect(hasPremium()).resolves.toBe(false);
  });

  it('configure가 던져도 초기화가 앱을 막지 않고 이후 hasPremium은 false', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    mockConfigure.mockImplementation(() => {
      throw new Error('boom');
    });
    const { initPurchases, hasPremium } = require('./purchases');
    expect(() => initPurchases()).not.toThrow();
    await expect(hasPremium()).resolves.toBe(false);
  });

  // 결제 결과 구분 — 퍼널에서 "고민하다 취소"와 "결제 장애"를 갈라 보기 위한 계약.
  // boolean이던 시절엔 둘이 같은 값이라 광고비를 태워도 원인을 못 읽었다.
  describe('purchasePremiumPackage 결과 구분', () => {
    const activeInfo = { entitlements: { active: { premium: {} } } };
    const emptyInfo = { entitlements: { active: {} } };
    const pkg = { identifier: '$rc_annual' } as never;

    // ⚠️ clearAllMocks는 호출기록만 지우고 mockImplementation은 남긴다.
    // 앞선 "configure가 던져도" 테스트의 throw 구현이 새어들어오면 SDK가
    // disabled로 굳어 모든 결과가 error가 된다 → 여기서 명시적으로 되돌린다.
    beforeEach(() => {
      mockConfigure.mockReset();
    });

    it('entitlement가 활성이면 success', async () => {
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
      mockPurchasePackage.mockResolvedValue({ customerInfo: activeInfo });
      const { purchasePremiumPackage } = require('./purchases');
      await expect(purchasePremiumPackage(pkg)).resolves.toBe('success');
    });

    it('유저 취소(userCancelled)는 cancelled — 에러로 집계하지 않는다', async () => {
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
      mockPurchasePackage.mockRejectedValue({ userCancelled: true });
      const { purchasePremiumPackage } = require('./purchases');
      await expect(purchasePremiumPackage(pkg)).resolves.toBe('cancelled');
    });

    it('그 외 실패는 error', async () => {
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
      mockPurchasePackage.mockRejectedValue(new Error('network'));
      const { purchasePremiumPackage } = require('./purchases');
      await expect(purchasePremiumPackage(pkg)).resolves.toBe('error');
    });

    it('결제는 통과했는데 entitlement가 없으면 언락 불가라 error', async () => {
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
      mockPurchasePackage.mockResolvedValue({ customerInfo: emptyInfo });
      const { purchasePremiumPackage } = require('./purchases');
      await expect(purchasePremiumPackage(pkg)).resolves.toBe('error');
    });

    it('키가 없으면(SDK 비활성) error — 성공으로 오검출하지 않는다', async () => {
      const { purchasePremiumPackage } = require('./purchases');
      await expect(purchasePremiumPackage(pkg)).resolves.toBe('error');
    });
  });

  describe('restorePurchases 결과 구분', () => {
    // 위와 동일 사유 — configure의 throw 구현 누수 차단.
    beforeEach(() => {
      mockConfigure.mockReset();
    });

    it('복원돼 entitlement가 살아나면 success', async () => {
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
      mockRestorePurchases.mockResolvedValue({
        entitlements: { active: { premium: {} } },
      });
      const { restorePurchases } = require('./purchases');
      await expect(restorePurchases()).resolves.toBe('success');
    });

    it('복원할 구매가 없으면 none (에러와 구분)', async () => {
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
      mockRestorePurchases.mockResolvedValue({ entitlements: { active: {} } });
      const { restorePurchases } = require('./purchases');
      await expect(restorePurchases()).resolves.toBe('none');
    });

    it('네트워크 실패는 error — "구매 없음"으로 오안내하지 않는다', async () => {
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
      mockRestorePurchases.mockRejectedValue(new Error('network'));
      const { restorePurchases } = require('./purchases');
      await expect(restorePurchases()).resolves.toBe('error');
    });
  });
});
