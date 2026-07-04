// Sentry 모킹 — init 호출 여부 + captureException 인자 검증용.
const mockInit = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: mockInit,
  captureException: mockCaptureException,
}));

describe('errorTracking', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // 모듈 내부 싱글턴 상태(initialized/enabled) 초기화
    jest.clearAllMocks(); // 호출 기록만 초기화
    mockCaptureException.mockImplementation(() => {}); // 기본: 정상 동작
    // 로그 스팸 방지 확인용 + 테스트 출력 정리
    jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env = { ...OLD_ENV };
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('DSN이 없으면 Sentry.init을 호출하지 않고 captureException이 no-op이다', () => {
    const { initErrorTracking, captureException } = require('./errorTracking');
    initErrorTracking();
    expect(mockInit).not.toHaveBeenCalled();
    expect(() => captureException(new Error('x'))).not.toThrow();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('DSN이 있으면 init에 dsn을 전달하고 이후 captureException이 Sentry로 전달된다', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o0.ingest.sentry.io/1';
    const { initErrorTracking, captureException } = require('./errorTracking');
    initErrorTracking();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://abc@o0.ingest.sentry.io/1',
      }),
    );
    const err = new Error('boom');
    captureException(err);
    expect(mockCaptureException).toHaveBeenCalledWith(err);
  });

  it('context를 넘기면 Sentry.captureException에 extra로 전달된다', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o0.ingest.sentry.io/1';
    const { initErrorTracking, captureException } = require('./errorTracking');
    initErrorTracking();
    const err = new Error('ctx');
    captureException(err, { where: 'test' });
    expect(mockCaptureException).toHaveBeenCalledWith(err, {
      extra: { where: 'test' },
    });
  });

  it('Sentry.captureException이 예외를 던져도 삼킨다 (앱 크래시 방지)', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o0.ingest.sentry.io/1';
    mockCaptureException.mockImplementation(() => {
      throw new Error('sentry down');
    });
    const { initErrorTracking, captureException } = require('./errorTracking');
    initErrorTracking();
    expect(() => captureException(new Error('x'))).not.toThrow();
  });

  it('initErrorTracking은 멱등이다 (여러 번 호출해도 init 1회)', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o0.ingest.sentry.io/1';
    const { initErrorTracking } = require('./errorTracking');
    initErrorTracking();
    initErrorTracking();
    initErrorTracking();
    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});
