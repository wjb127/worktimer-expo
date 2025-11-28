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
