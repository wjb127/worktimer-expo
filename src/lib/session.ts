import { WorkSession } from '../types/session';
import { getLocalToday } from './dateUtils';
import {
  apiGetTodayTotal,
  apiGetOngoing,
  apiStart,
  apiEnd,
  apiCleanupOrphaned,
} from './api/sessions';

const getToday = (): string => getLocalToday();

export const getTodayTotal = async (): Promise<number> => {
  try {
    return await apiGetTodayTotal(getToday());
  } catch (e) {
    console.error('getTodayTotal error:', e);
    return 0;
  }
};

export const getOngoingSession = async (): Promise<WorkSession | null> => {
  try {
    return await apiGetOngoing();
  } catch (e) {
    console.error('getOngoingSession error:', e);
    return null;
  }
};

export const startSession = async (): Promise<WorkSession | null> => {
  try {
    return await apiStart(getToday());
  } catch (e) {
    console.error('startSession error:', e);
    return null;
  }
};

// startTime 인자는 더 이상 안 쓰지만(서버가 계산) 호출부 호환 위해 시그니처 유지
export const endSession = async (
  sessionId: string,
  _startTime?: string,
): Promise<WorkSession | null> => {
  try {
    return await apiEnd(sessionId);
  } catch (e) {
    console.error('endSession error:', e);
    return null;
  }
};

// excludeId는 서버가 JWT 기준으로 처리하므로 무시(시그니처만 유지)
export const cleanupOrphanedSessions = async (
  _excludeSessionId?: string,
): Promise<number> => {
  try {
    return await apiCleanupOrphaned(getToday());
  } catch (e) {
    console.error('cleanupOrphanedSessions error:', e);
    return 0;
  }
};
