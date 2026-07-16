import { apiJson, apiFetch } from './client';
import { WorkSession } from '../../types/session';

interface ApiSession {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  date: string;
  createdAt: string;
}

export const mapSession = (s: ApiSession): WorkSession => ({
  id: s.id,
  start_time: s.startTime,
  end_time: s.endTime,
  duration: s.duration,
  date: s.date,
  created_at: s.createdAt,
});

export const apiGetTodayTotal = (date: string) =>
  apiJson<{ total: number }>(
    `/worktimer/sessions/today-total?date=${date}`,
  ).then((r) => r.total);

export const apiGetOngoing = async (): Promise<WorkSession | null> => {
  const res = await apiFetch('/worktimer/sessions/ongoing');
  if (!res.ok) return null;
  // 진행중 세션이 없으면 백엔드가 200 + 빈 본문(null 직렬화)을 반환 →
  // 빈 문자열을 res.json()에 넣으면 SyntaxError. 본문 길이로 먼저 가드.
  const text = await res.text();
  if (!text) return null;
  const data = JSON.parse(text);
  return data ? mapSession(data) : null;
};

export const apiStart = (date: string) =>
  apiJson<ApiSession>('/worktimer/sessions', {
    method: 'POST',
    body: JSON.stringify({ date }),
  }).then(mapSession);

export const apiEnd = (id: string) =>
  apiJson<ApiSession>(`/worktimer/sessions/${id}`, { method: 'PATCH' }).then(
    mapSession,
  );

export const apiEditTimes = (id: string, startTime: string, endTime: string) =>
  apiJson<ApiSession>(`/worktimer/sessions/${id}/edit`, {
    method: 'PATCH',
    body: JSON.stringify({ startTime, endTime }),
  }).then(mapSession);

// 임의 시작/종료로 완료 세션 생성 (CalendarView 빈 구간 추가)
export const apiCreateManual = (
  startTime: string,
  endTime: string,
  date: string,
) =>
  apiJson<ApiSession>('/worktimer/sessions/manual', {
    method: 'POST',
    body: JSON.stringify({ startTime, endTime, date }),
  }).then(mapSession);

export const apiDelete = (id: string) =>
  apiFetch(`/worktimer/sessions/${id}`, { method: 'DELETE' }).then((res) => {
    // 감사 #10: 404/500을 성공처럼 삼키면 화면-서버 불일치 — 실패는 throw
    if (!res.ok) throw new Error(`API ${res.status} DELETE session`);
  });

export const apiListSessions = (from: string, to: string) =>
  apiJson<ApiSession[]>(
    `/worktimer/sessions?from=${from}&to=${to}`,
  ).then((arr) => arr.map(mapSession));

export const apiCleanupOrphaned = (today: string) =>
  apiJson<{ cleaned: number }>('/worktimer/sessions/cleanup-orphaned', {
    method: 'POST',
    body: JSON.stringify({ today }),
  }).then((r) => r.cleaned);
