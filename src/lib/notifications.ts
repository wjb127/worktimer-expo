import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 저장 키
const STORAGE_KEYS = {
  WORK_REMINDER_ENABLED: '@settings/workReminderEnabled',
  WORK_REMINDER_TIME: '@settings/workReminderTime',
  WORK_REMINDER_DAYS: '@settings/workReminderDays',
  WORK_INTERVAL_NOTIFICATION_ENABLED: '@settings/workIntervalNotificationEnabled',
  WORK_INTERVAL_MINUTES: '@settings/workIntervalMinutes',
};

// 요일 타입
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 일=0, 월=1, ..., 토=6

export interface WorkReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  days: WeekDay[]; // 알림 받을 요일
}

// 기본 설정
export const DEFAULT_WORK_REMINDER: WorkReminderSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
  days: [1, 2, 3, 4, 5], // 평일
};

// 업무 중 반복 알림 설정 인터페이스
export interface WorkIntervalSettings {
  enabled: boolean;
  intervalMinutes: number; // 10분 ~ 1200분 (20시간)
}

// 업무 중 반복 알림 기본 설정
export const DEFAULT_WORK_INTERVAL: WorkIntervalSettings = {
  enabled: true,
  intervalMinutes: 60, // 기본 1시간
};

// 사용 가능한 알림 주기 옵션 (분 단위)
export const INTERVAL_OPTIONS = [
  { label: '10분', value: 10 },
  { label: '15분', value: 15 },
  { label: '20분', value: 20 },
  { label: '30분', value: 30 },
  { label: '45분', value: 45 },
  { label: '1시간', value: 60 },
  { label: '1시간 30분', value: 90 },
  { label: '2시간', value: 120 },
  { label: '3시간', value: 180 },
  { label: '4시간', value: 240 },
  { label: '6시간', value: 360 },
  { label: '8시간', value: 480 },
  { label: '12시간', value: 720 },
  { label: '20시간', value: 1200 },
];

// 알림 권한 요청
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('work-reminder', {
      name: '업무 시작 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  return true;
}

// 설정 불러오기
export async function getWorkReminderSettings(): Promise<WorkReminderSettings> {
  try {
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.WORK_REMINDER_ENABLED);
    const time = await AsyncStorage.getItem(STORAGE_KEYS.WORK_REMINDER_TIME);
    const days = await AsyncStorage.getItem(STORAGE_KEYS.WORK_REMINDER_DAYS);

    return {
      enabled: enabled === 'true',
      hour: time ? JSON.parse(time).hour : DEFAULT_WORK_REMINDER.hour,
      minute: time ? JSON.parse(time).minute : DEFAULT_WORK_REMINDER.minute,
      days: days ? JSON.parse(days) : DEFAULT_WORK_REMINDER.days,
    };
  } catch {
    return DEFAULT_WORK_REMINDER;
  }
}

// 설정 저장
export async function saveWorkReminderSettings(settings: WorkReminderSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.WORK_REMINDER_ENABLED, String(settings.enabled));
  await AsyncStorage.setItem(
    STORAGE_KEYS.WORK_REMINDER_TIME,
    JSON.stringify({ hour: settings.hour, minute: settings.minute })
  );
  await AsyncStorage.setItem(STORAGE_KEYS.WORK_REMINDER_DAYS, JSON.stringify(settings.days));
}

// 업무 중 반복 알림 설정 불러오기
export async function getWorkIntervalSettings(): Promise<WorkIntervalSettings> {
  try {
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.WORK_INTERVAL_NOTIFICATION_ENABLED);
    const intervalMinutes = await AsyncStorage.getItem(STORAGE_KEYS.WORK_INTERVAL_MINUTES);

    return {
      enabled: enabled === null ? DEFAULT_WORK_INTERVAL.enabled : enabled === 'true',
      intervalMinutes: intervalMinutes
        ? parseInt(intervalMinutes, 10)
        : DEFAULT_WORK_INTERVAL.intervalMinutes,
    };
  } catch {
    return DEFAULT_WORK_INTERVAL;
  }
}

// 업무 중 반복 알림 설정 저장
export async function saveWorkIntervalSettings(settings: WorkIntervalSettings): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.WORK_INTERVAL_NOTIFICATION_ENABLED,
    String(settings.enabled)
  );
  await AsyncStorage.setItem(
    STORAGE_KEYS.WORK_INTERVAL_MINUTES,
    String(settings.intervalMinutes)
  );
}

// 업무 시작 알림 스케줄링
export async function scheduleWorkReminder(settings: WorkReminderSettings): Promise<void> {
  // 기존 알림 취소
  await cancelWorkReminder();

  if (!settings.enabled || settings.days.length === 0) {
    return;
  }

  // 각 요일별로 알림 스케줄
  for (const day of settings.days) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '업무 시작 시간입니다!',
        body: '오늘도 화이팅! 타이머를 시작해보세요.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day === 0 ? 1 : day + 1, // expo는 1=일요일, 우리는 0=일요일
        hour: settings.hour,
        minute: settings.minute,
      },
    });
  }
}

// 업무 시작 알림 취소
export async function cancelWorkReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }
}

// 알림 테스트
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '테스트 알림',
      body: '알림이 정상적으로 작동합니다!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}

// 업무 진행 중 알림 ID prefix
const INTERVAL_NOTIFICATION_PREFIX = 'interval-work-';
const MAX_NOTIFICATIONS = 100; // iOS에서 스케줄 가능한 최대 알림 수 제한

// 경과 시간을 읽기 쉬운 형식으로 변환
const formatElapsedTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}시간 ${mins}분`;
  } else if (hours > 0) {
    return `${hours}시간`;
  }
  return `${mins}분`;
};

// 알림 메시지 생성
const getNotificationMessage = (elapsedMinutes: number): string => {
  const messages = [
    '잘 하고 있어요!',
    '잠깐 스트레칭 어때요?',
    '집중력 최고!',
    '휴식이 필요할 수도?',
    '타이머 끄는 거 잊지 않으셨죠?',
    '오늘 정말 열심히 하시네요!',
    '혹시 타이머 끄는 거 깜빡하셨나요?',
  ];

  const hours = elapsedMinutes / 60;
  if (hours >= 8) return '풀타임 근무 완료! 이제 쉬세요!';
  if (hours >= 6) return '야근 모드? 조금만 더 힘내요!';
  if (hours >= 4) return '타이머 확인해주세요!';

  return messages[Math.floor(Math.random() * messages.length)];
};

// 업무 진행 중 반복 알림 스케줄링 (사용자 설정 주기)
// elapsedSeconds: 이미 경과한 시간 (초). 앱 재시작 시 사용
export async function scheduleIntervalWorkNotifications(
  elapsedSeconds: number = 0,
  settings?: WorkIntervalSettings
): Promise<void> {
  // 기존 알림 취소
  await cancelIntervalWorkNotifications();

  // 설정 로드
  const intervalSettings = settings || await getWorkIntervalSettings();

  if (!intervalSettings.enabled) {
    return;
  }

  const intervalMinutes = intervalSettings.intervalMinutes;
  const intervalSeconds = intervalMinutes * 60;
  const maxDurationSeconds = 20 * 60 * 60; // 최대 20시간

  // 다음 알림 시간 계산
  const elapsedIntervals = Math.floor(elapsedSeconds / intervalSeconds);
  let nextNotificationNumber = elapsedIntervals + 1;

  let scheduledCount = 0;

  while (scheduledCount < MAX_NOTIFICATIONS) {
    const elapsedMinutesAtNotification = nextNotificationNumber * intervalMinutes;
    const secondsUntilNotification = (nextNotificationNumber * intervalSeconds) - elapsedSeconds;

    // 20시간 초과하면 중단
    if (elapsedMinutesAtNotification * 60 > maxDurationSeconds) break;

    // 이미 지난 시간은 스킵
    if (secondsUntilNotification <= 0) {
      nextNotificationNumber++;
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${formatElapsedTime(elapsedMinutesAtNotification)} 업무 중`,
        body: getNotificationMessage(elapsedMinutesAtNotification),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilNotification,
      },
      identifier: `${INTERVAL_NOTIFICATION_PREFIX}${nextNotificationNumber}`,
    });

    scheduledCount++;
    nextNotificationNumber++;
  }
}

// 업무 진행 중 반복 알림 취소
export async function cancelIntervalWorkNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith(INTERVAL_NOTIFICATION_PREFIX)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      } catch {
        // 알림이 없을 수 있음
      }
    }
  }
}

// 하위 호환성을 위한 별칭 함수
export async function scheduleHourlyWorkNotifications(elapsedSeconds: number = 0): Promise<void> {
  return scheduleIntervalWorkNotifications(elapsedSeconds);
}

export async function cancelHourlyWorkNotifications(): Promise<void> {
  return cancelIntervalWorkNotifications();
}
