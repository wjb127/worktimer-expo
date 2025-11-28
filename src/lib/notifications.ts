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

// 업무 진행 중 시간별 알림 ID prefix
const HOURLY_NOTIFICATION_PREFIX = 'hourly-work-';

// 업무 진행 중 시간별 알림 스케줄링 (1시간, 2시간, ... 최대 12시간)
// elapsedSeconds: 이미 경과한 시간 (초). 앱 재시작 시 사용
export async function scheduleHourlyWorkNotifications(elapsedSeconds: number = 0): Promise<void> {
  // 기존 시간별 알림 취소
  await cancelHourlyWorkNotifications();

  const messages = [
    '1시간 업무 중! 💪 잘 하고 있어요!',
    '2시간 업무 중! ☕ 잠깐 스트레칭 어때요?',
    '3시간 업무 중! 🎯 집중력 최고!',
    '4시간 업무 중! 🍽️ 휴식이 필요할 수도?',
    '5시간 업무 중! ⏰ 타이머 끄는 거 잊지 않으셨죠?',
    '6시간 업무 중! 🌟 오늘 정말 열심히 하시네요!',
    '7시간 업무 중! 😅 혹시 타이머 끄는 거 깜빡하셨나요?',
    '8시간 업무 중! 🏆 풀타임 근무 완료!',
    '9시간 업무 중! 🌙 야근 모드?',
    '10시간 업무 중! 😴 이제 좀 쉬세요!',
    '11시간 업무 중! ⚠️ 타이머 확인해주세요!',
    '12시간 업무 중! 🚨 타이머가 계속 돌아가고 있어요!',
  ];

  const elapsedHours = Math.floor(elapsedSeconds / 3600);

  for (let hour = 1; hour <= 12; hour++) {
    // 이미 경과한 시간은 스킵
    if (hour <= elapsedHours) continue;

    const secondsUntilNotification = (hour * 3600) - elapsedSeconds;
    if (secondsUntilNotification <= 0) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${hour}시간 경과`,
        body: messages[hour - 1],
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilNotification,
      },
      identifier: `${HOURLY_NOTIFICATION_PREFIX}${hour}`,
    });
  }
}

// 업무 진행 중 시간별 알림 취소
export async function cancelHourlyWorkNotifications(): Promise<void> {
  for (let hour = 1; hour <= 12; hour++) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        `${HOURLY_NOTIFICATION_PREFIX}${hour}`
      );
    } catch {
      // 알림이 없을 수 있음
    }
  }
}
