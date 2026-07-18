const mockStartActivity = jest.fn();
const mockUpdateActivity = jest.fn();
const mockStopActivity = jest.fn();
let mockPlatformOS = 'ios';

jest.mock('expo-live-activity', () => ({
  startActivity: (...args: unknown[]) => mockStartActivity(...args),
  updateActivity: (...args: unknown[]) => mockUpdateActivity(...args),
  stopActivity: (...args: unknown[]) => mockStopActivity(...args),
}));

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
  },
}));

function load() {
  return require('./liveActivity') as typeof import('./liveActivity');
}

const expectedBrandImages = {
  imageName: 'filltime-mark',
  dynamicIslandImageName: 'filltime-mark-island',
};

describe('liveActivity 브랜드 이미지', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPlatformOS = 'ios';
    mockStartActivity.mockReturnValue('activity-1');
  });

  it('시작 상태와 이미지 레이아웃 설정을 함께 전달한다', async () => {
    const { startLiveActivity } = load();

    await startLiveActivity(new Date(2026, 6, 18, 9, 30), 3600);

    expect(mockStartActivity).toHaveBeenCalledWith(
      expect.objectContaining(expectedBrandImages),
      expect.objectContaining({
        imagePosition: 'left',
        imageAlign: 'center',
        imageSize: { width: 36, height: 36 },
        contentFit: 'contain',
      })
    );
  });

  it('업데이트할 때 imageName을 빠뜨리지 않는다', async () => {
    const { startLiveActivity, updateLiveActivity } = load();
    await startLiveActivity(new Date(2026, 6, 18, 9, 30), 3600);

    await updateLiveActivity(10, 3600);

    expect(mockUpdateActivity).toHaveBeenCalledWith(
      'activity-1',
      expect.objectContaining(expectedBrandImages)
    );
  });

  it('종료 상태에도 브랜드 이미지를 유지한다', async () => {
    const { startLiveActivity, endLiveActivity } = load();
    await startLiveActivity(new Date(2026, 6, 18, 9, 30), 3600);

    await endLiveActivity();

    expect(mockStopActivity).toHaveBeenCalledWith(
      'activity-1',
      expect.objectContaining(expectedBrandImages)
    );
  });

  it('Android에서는 기존처럼 네이티브 모듈을 호출하지 않는다', async () => {
    mockPlatformOS = 'android';
    const { startLiveActivity, updateLiveActivity, endLiveActivity } = load();

    await expect(startLiveActivity(new Date(), 0)).resolves.toBeNull();
    await expect(updateLiveActivity(10, 0)).resolves.toBe(false);
    await expect(endLiveActivity()).resolves.toBe(false);
    expect(mockStartActivity).not.toHaveBeenCalled();
    expect(mockUpdateActivity).not.toHaveBeenCalled();
    expect(mockStopActivity).not.toHaveBeenCalled();
  });
});
