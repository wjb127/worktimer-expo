const scheduledNotifications: Array<{ identifier: string }> = [];
const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 'high' },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    WEEKLY: 'weekly',
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'project-id' } } },
}));
jest.mock('./api/profile', () => ({
  apiRegisterPushToken: jest.fn().mockResolvedValue(undefined),
  apiUnregisterPushToken: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./notificationInbox', () => ({
  addToInbox: jest.fn().mockResolvedValue(undefined),
}));

describe('interval notifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    scheduledNotifications.length = 0;
    mockGetAllScheduledNotificationsAsync.mockImplementation(async () => [
      ...scheduledNotifications,
    ]);
    mockScheduleNotificationAsync.mockImplementation(
      async ({ identifier }: { identifier: string }) => {
        scheduledNotifications.push({ identifier });
        return identifier;
      },
    );
    mockCancelScheduledNotificationAsync.mockImplementation(
      async (identifier: string) => {
        const index = scheduledNotifications.findIndex(
          (notification) => notification.identifier === identifier,
        );
        if (index >= 0) scheduledNotifications.splice(index, 1);
      },
    );
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
  });

  it('iOS 전체 64개 한도에서 다른 알림 수를 뺀 만큼만 예약한다', async () => {
    for (let index = 0; index < 8; index++) {
      scheduledNotifications.push({ identifier: `work-reminder-${index}` });
    }
    const { scheduleIntervalWorkNotifications } = require('./notifications');

    await scheduleIntervalWorkNotifications(0, {
      enabled: true,
      intervalMinutes: 10,
    });

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(56);
    expect(scheduledNotifications).toHaveLength(64);
  });

  it('취소가 시작되면 진행 중인 이전 세대 예약을 중단하고 남은 알림을 지운다', async () => {
    let releaseFirstSchedule: (() => void) | undefined;
    const firstSchedule = new Promise<void>((resolve) => {
      releaseFirstSchedule = resolve;
    });
    mockScheduleNotificationAsync.mockImplementationOnce(
      async ({ identifier }: { identifier: string }) => {
        scheduledNotifications.push({ identifier });
        await firstSchedule;
        return identifier;
      },
    );
    const {
      scheduleIntervalWorkNotifications,
      cancelIntervalWorkNotifications,
    } = require('./notifications');

    const scheduling = scheduleIntervalWorkNotifications(0, {
      enabled: true,
      intervalMinutes: 10,
    });
    await new Promise((resolve) => setImmediate(resolve));
    const cancelling = cancelIntervalWorkNotifications();
    releaseFirstSchedule?.();

    await Promise.all([scheduling, cancelling]);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(
      scheduledNotifications.filter((notification) =>
        notification.identifier.startsWith('interval-work-'),
      ),
    ).toHaveLength(0);
  });

  it('로그인 시 권한이 없으면 알림 팝업을 요청하지 않는다', async () => {
    const { registerForPushNotifications } = require('./notifications');

    await registerForPushNotifications();

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
  });
});
