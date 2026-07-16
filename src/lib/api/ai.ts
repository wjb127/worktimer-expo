import { apiJson } from './client';

// AI 분석 채팅 API — GPT식 세션 (백엔드 /ai/*)

export type AnalyzeRange = 'day' | 'week' | 'month';

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export const apiListChatSessions = () =>
  apiJson<ChatSessionSummary[]>('/ai/sessions');

export const apiCreateChatSession = () =>
  apiJson<ChatSessionSummary>('/ai/sessions', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const apiGetChatMessages = (sessionId: string) =>
  apiJson<ChatMessage[]>(`/ai/sessions/${sessionId}/messages`);

export const apiPostChatMessage = (
  sessionId: string,
  body: { content?: string; analyze?: AnalyzeRange },
) =>
  apiJson<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
    `/ai/sessions/${sessionId}/messages`,
    { method: 'POST', body: JSON.stringify(body) },
  );

export const apiDeleteChatSession = (sessionId: string) =>
  apiJson<{ ok: boolean }>(`/ai/sessions/${sessionId}`, { method: 'DELETE' });
