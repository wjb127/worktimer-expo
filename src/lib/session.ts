import { supabase } from '../../lib/supabase';
import { WorkSession, SessionInsert } from '../types/session';

const getToday = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

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

export const getOngoingSession = async (): Promise<WorkSession | null> => {
  const today = getToday();
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('date', today)
    .is('end_time', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
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

export const endSession = async (
  sessionId: string,
  duration: number
): Promise<WorkSession | null> => {
  const now = new Date();

  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      end_time: now.toISOString(),
      duration: duration,
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
