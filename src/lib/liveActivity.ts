import * as LiveActivity from 'expo-live-activity';
import { Platform } from 'react-native';

let currentActivityId: string | null = null;

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

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
    const state = {
      title: '업무 중',
      subtitle: `오늘 총: ${formatTime(todayTotal)}`,
      progressBar: {
        // 타이머 시작 시간 (카운트업으로 표시)
        date: startTime.getTime(),
      },
    };

    const config = {
      backgroundColor: '#1C1C1E',
      titleColor: '#FFFFFF',
      subtitleColor: '#8E8E93',
      progressBarColor: '#34C759',
      timerType: 'countUp' as const,
    };

    const activityId = LiveActivity.startActivity(state, config);
    currentActivityId = activityId;
    console.log('Live Activity started:', activityId);
    return activityId;
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
    const state = {
      title: '업무 중',
      subtitle: `오늘 총: ${formatTime(todayTotal + elapsedSeconds)}`,
      progressBar: {
        progress: (elapsedSeconds % 3600) / 3600, // 1시간 기준 진행률
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
    LiveActivity.stopActivity(currentActivityId);
    console.log('Live Activity ended:', currentActivityId);
    currentActivityId = null;
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
