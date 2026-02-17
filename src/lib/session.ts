import { supabase } from '../../lib/supabase';
import { WorkSession, SessionInsert } from '../types/session';
import { getLocalToday } from './dateUtils';

const getToday = (): string => getLocalToday();

export const getTodayTotal = async (): Promise<number> => {
  const today = getToday();
  const { data, error } = await supabase
    .from('work_sessions')
    .select('duration')
    .eq('date', today)
    .not('end_time', 'is', null);

  if (error) {
    console.error('getTodayTotal error:', error);
    return 0;
  }

  return data?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;
};

// 날짜 필터 없이 진행 중인 세션 조회 (자정 넘김 대응)
export const getOngoingSession = async (): Promise<WorkSession | null> => {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .is('end_time', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('getOngoingSession error:', error);
    return null;
  }

  return data;
};

export const startSession = async (): Promise<WorkSession | null> => {
  const now = new Date();
  const today = getToday();

  const sessionData: SessionInsert = {
    start_time: now.toISOString(),
    end_time: null,
    duration: 0,
    date: today,
  };

  const { data, error } = await supabase
    .from('work_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('startSession error:', error);
    return null;
  }

  return data;
};

// duration을 타임스탬프 기반으로 계산 (클라이언트 카운터 대신)
export const endSession = async (
  sessionId: string,
  startTime: string
): Promise<WorkSession | null> => {
  const now = new Date();
  const start = new Date(startTime);
  const duration = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));

  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      end_time: now.toISOString(),
      duration,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('endSession error:', error);
    return null;
  }

  return data;
};

// 이전 날짜의 미종료 고아 세션 정리 (현재 진행 중인 세션은 제외)
export const cleanupOrphanedSessions = async (
  excludeSessionId?: string
): Promise<number> => {
  const today = getToday();

  let query = supabase
    .from('work_sessions')
    .select('*')
    .is('end_time', null)
    .lt('date', today);

  if (excludeSessionId) {
    query = query.neq('id', excludeSessionId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return 0;
  }

  for (const session of data) {
    const start = new Date(session.start_time);
    // 해당 날짜 23:59:59로 종료 처리
    const sessionDate = new Date(session.date + 'T23:59:59');
    const duration = Math.max(0, Math.floor((sessionDate.getTime() - start.getTime()) / 1000));

    await supabase
      .from('work_sessions')
      .update({
        end_time: sessionDate.toISOString(),
        duration,
      })
      .eq('id', session.id);
  }

  console.log(`cleanupOrphanedSessions: ${data.length}개 고아 세션 정리 완료`);
  return data.length;
};
