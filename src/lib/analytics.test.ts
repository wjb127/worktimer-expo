// PostHog 모킹 — 생성자 호출 여부 + capture 인자 검증용.
// 안정 참조(mockCapture 등)를 밖에 두고, 생성자는 이를 참조하는 객체를 반환.
const mockCapture = jest.fn();
const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockConstructor = jest.fn().mockImplementation(() => ({
  capture: mockCapture,
  identify: mockIdentify,
  reset: mockReset,
}));

jest.mock('posthog-react-native', () => ({
  PostHog: mockConstructor,
}));

describe('analytics', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // 모듈 내부 싱글턴 상태(initialized/client/disabled) 초기화
    jest.clearAllMocks(); // 호출 기록만 초기화 (구현은 유지)
    mockCapture.mockImplementation(() => {}); // 기본: 정상 동작
    // 로그 스팸 방지 확인용 + 테스트 출력 정리
    jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env = { ...OLD_ENV };
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('키가 없으면 PostHog를 생성하지 않고 track이 예외를 던지지 않는다', () => {
    const { track } = require('./analytics');
    expect(() => track('app_open')).not.toThrow();
    expect(mockConstructor).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('키가 있으면 track이 PostHog capture에 이벤트명을 전달한다', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    const { initAnalytics, track } = require('./analytics');
    initAnalytics();
    track('app_open');
    expect(mockConstructor).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ host: expect.any(String) }),
    );
    expect(mockCapture).toHaveBeenCalledWith('app_open', undefined);
  });

  it('props를 넘기면 capture에 그대로 전달된다', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    const { track } = require('./analytics');
    track('session_end', { duration_seconds: 120 });
    expect(mockCapture).toHaveBeenCalledWith('session_end', {
      duration_seconds: 120,
    });
  });

  it('capture가 예외를 던져도 track이 삼킨다 (앱 크래시 방지)', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    mockCapture.mockImplementation(() => {
      throw new Error('boom');
    });
    const { track } = require('./analytics');
    expect(() => track('app_open')).not.toThrow();
  });

  it('initAnalytics는 멱등이다 (여러 번 호출해도 생성자 1회)', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    const { initAnalytics } = require('./analytics');
    initAnalytics();
    initAnalytics();
    initAnalytics();
    expect(mockConstructor).toHaveBeenCalledTimes(1);
  });
});
