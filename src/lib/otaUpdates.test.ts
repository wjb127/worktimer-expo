const mockCheckForUpdateAsync = jest.fn();
const mockFetchUpdateAsync = jest.fn();
const mockReloadAsync = jest.fn();

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: mockCheckForUpdateAsync,
  fetchUpdateAsync: mockFetchUpdateAsync,
  reloadAsync: mockReloadAsync,
}));

describe('otaUpdates', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
    mockFetchUpdateAsync.mockResolvedValue({});
    (global as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;
  });

  it('업데이트를 받아두되 실행 중 앱을 리로드하지 않는다', async () => {
    const { checkAndApplyUpdate } = require('./otaUpdates');

    await checkAndApplyUpdate();

    expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockReloadAsync).not.toHaveBeenCalled();
  });

  it('업데이트가 없으면 다운로드하지 않는다', async () => {
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false });
    const { checkAndApplyUpdate } = require('./otaUpdates');

    await checkAndApplyUpdate();

    expect(mockFetchUpdateAsync).not.toHaveBeenCalled();
    expect(mockReloadAsync).not.toHaveBeenCalled();
  });
});
