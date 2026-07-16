import { apiJson, apiFetch } from './client';

// 백엔드 Prisma 응답은 camelCase 그대로 사용 (별도 매핑 불필요)
export interface Todo {
  id: string;
  title: string;
  status: 'pending' | 'done';
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  totalDuration?: number; // includeTime=true 일 때만 (세션 연결 누적 작업시간, 초)
}

// 할일 목록. status 필터 + 누적시간 집계 옵션.
export const apiListTodos = (opts?: { status?: 'pending' | 'done'; includeTime?: boolean }) => {
  const p = new URLSearchParams();
  if (opts?.status) p.set('status', opts.status);
  if (opts?.includeTime) p.set('includeTime', 'true');
  const qs = p.toString();
  return apiJson<Todo[]>(`/worktimer/todos${qs ? `?${qs}` : ''}`);
};

export const apiCreateTodo = (title: string) =>
  apiJson<Todo>('/worktimer/todos', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

export const apiUpdateTodo = (
  id: string,
  data: { title?: string; status?: 'pending' | 'done'; sortOrder?: number },
) =>
  apiJson<Todo>(`/worktimer/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const apiDeleteTodo = (id: string) =>
  apiFetch(`/worktimer/todos/${id}`, { method: 'DELETE' }).then((res) => {
    // 감사 #10: 404/500을 성공처럼 삼키면 화면-서버 불일치 — 실패는 throw
    if (!res.ok) throw new Error(`API ${res.status} DELETE todo`);
  });

export const apiReorderTodos = (items: { id: string; sortOrder: number }[]) =>
  apiJson<{ ok: boolean }>('/worktimer/todos/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  });

// ===== 세션-할일 연결 / 세션 메타 (백엔드 sessions 컨트롤러에 이미 존재) =====

// 세션에 연결된 할일 목록
export const apiGetSessionTodos = (sessionId: string) =>
  apiJson<Todo[]>(`/worktimer/sessions/${sessionId}/todos`);

// 세션 할일 링크 전체 교체 (set 갈아끼움)
export const apiSetSessionTodos = (sessionId: string, todoIds: string[]) =>
  apiJson<Todo[]>(`/worktimer/sessions/${sessionId}/todos`, {
    method: 'PUT',
    body: JSON.stringify({ todoIds }),
  });

// 세션 메타(업무 내용/카테고리) upsert
export const apiUpdateSessionMeta = (
  sessionId: string,
  data: { category?: string | null; description?: string | null },
) =>
  apiJson<{ sessionId: string; category: string | null; description: string | null }>(
    `/worktimer/sessions/${sessionId}/meta`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
