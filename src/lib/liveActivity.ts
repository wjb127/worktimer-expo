import * as LiveActivity from 'expo-live-activity';
import { Platform } from 'react-native';

let currentActivityId: string | null = null;
let sessionStartTime: Date | null = null;

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatStartTime = (date: Date): string => {
  const hours = date.getHours();
  const mins = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// 15시간 기준 진행률 (최대 1)
const DAILY_GOAL_SECONDS = 15 * 3600;

/**
 * Live Activity 시작
 * @param startTime 세션 시작 시간
 * @param todayTotal 오늘 총 업무 시간 (초)
 */
export async function startLiveActivity(
  startTime: Date,
  todayTotal: number
): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    sessionStartTime = startTime;
    const progress = Math.min(todayTotal / DAILY_GOAL_SECONDS, 1);

    const state = {
      title: `${formatStartTime(startTime)} 시작`,
      subtitle: `현재 세션: ${formatTime(0)}`,
      progressBar: {
        progress: progress,
      },
    };

    const config = {
      backgroundColor: '#1C1C1E',
      titleColor: '#FFFFFF',
      subtitleColor: '#8E8E93',
      progressViewTint: '#34C759',
      timerType: 'digital' as const,
    };

    const activityId = LiveActivity.startActivity(state, config);
    currentActivityId = activityId ?? null;
    console.log('Live Activity started:', activityId);
    return activityId ?? null;
  } catch (error) {
    console.error('Failed to start Live Activity:', error);
    return null;
  }
}

/**
 * Live Activity 업데이트
 * @param elapsedSeconds 경과 시간 (초)
 * @param todayTotal 오늘 총 업무 시간 (초)
 */
export async function updateLiveActivity(
  elapsedSeconds: number,
  todayTotal: number
): Promise<boolean> {
  if (Platform.OS !== 'ios' || !currentActivityId) return false;

  try {
    const totalSeconds = todayTotal + elapsedSeconds;
    const progress = Math.min(totalSeconds / DAILY_GOAL_SECONDS, 1);
    const startTimeStr = sessionStartTime ? formatStartTime(sessionStartTime) : '--:--';

    const state = {
      title: `${startTimeStr} 시작`,
      subtitle: `현재 세션: ${formatTime(elapsedSeconds)}`,
      progressBar: {
        progress: progress,
      },
    };

    LiveActivity.updateActivity(currentActivityId, state);
    return true;
  } catch (error) {
    console.error('Failed to update Live Activity:', error);
    return false;
  }
}

/**
 * Live Activity 종료
 */
export async function endLiveActivity(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !currentActivityId) return false;

  try {
    const finalState = {
      title: '업무 종료',
      subtitle: '수고하셨습니다',
    };
    LiveActivity.stopActivity(currentActivityId, finalState);
    console.log('Live Activity ended:', currentActivityId);
    currentActivityId = null;
    sessionStartTime = null;
    return true;
  } catch (error) {
    console.error('Failed to end Live Activity:', error);
    return false;
  }
}

/**
 * Live Activity 실행 중인지 확인
 */
export async function isLiveActivityRunning(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return currentActivityId !== null;
}

/**
 * Live Activities 활성화 여부 확인
 */
export async function areLiveActivitiesEnabled(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  // expo-live-activity는 iOS 16.2+ 에서 자동으로 활성화 체크
  return true;
}
