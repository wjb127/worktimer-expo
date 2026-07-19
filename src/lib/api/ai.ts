import { fetch as expoFetch } from 'expo/fetch';
import type { FetchRequestInit } from 'expo/fetch';
import { apiFetchWith, apiJson } from './client';

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

export type ChatMessageBody = {
  content?: string;
  analyze?: AnalyzeRange;
  clientMessageId?: string;
};

export type StreamDone = {
  userMessageId: string;
  assistantMessageId: string;
};

export type StreamChatCallbacks = {
  onToken: (text: string, replace: boolean) => void;
  onDone: (result: StreamDone) => void;
  onError: (message: string) => void;
};

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
  body: ChatMessageBody,
) =>
  apiJson<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
    `/ai/sessions/${sessionId}/messages`,
    { method: 'POST', body: JSON.stringify(body) },
  );

const dispatchSseEvent = (
  event: string,
  data: string,
  callbacks: StreamChatCallbacks,
): StreamDone | null => {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    payload = data;
  }

  if (event === 'token') {
    const token = payload as { text?: unknown; replace?: unknown };
    if (typeof token.text === 'string') {
      callbacks.onToken(token.text, token.replace === true);
    }
    return null;
  }
  if (event === 'done') {
    const done = payload as Partial<StreamDone>;
    if (
      typeof done.userMessageId !== 'string' ||
      typeof done.assistantMessageId !== 'string'
    ) {
      throw new Error('SSE done payload가 올바르지 않습니다.');
    }
    const result = done as StreamDone;
    callbacks.onDone(result);
    return result;
  }
  if (event === 'error') {
    const error = payload as { message?: unknown };
    const message =
      typeof error.message === 'string'
        ? error.message
        : 'AI 응답 스트림이 중단됐어요.';
    callbacks.onError(message);
    throw new Error(message);
  }
  return null;
};

export async function consumeSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: StreamChatCallbacks,
): Promise<StreamDone> {
  const decoder = new TextDecoder();
  let buffer = '';
  let doneResult: StreamDone | null = null;

  const consume = (record: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of record.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length > 0) {
      doneResult = dispatchSseEvent(event, data.join('\n'), callbacks);
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        consume(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!doneResult) throw new Error('SSE 스트림이 완료 전에 종료됐습니다.');
  return doneResult;
}

export async function streamChatMessage(
  sessionId: string,
  body: ChatMessageBody,
  callbacks: StreamChatCallbacks,
): Promise<StreamDone> {
  const streamingFetch = (url: string, init?: RequestInit) => {
    const expoInit: FetchRequestInit = {
      method: init?.method,
      headers: init?.headers,
      body: init?.body ?? undefined,
      credentials: init?.credentials,
      signal: init?.signal ?? undefined,
      redirect: init?.redirect,
      integrity: init?.integrity,
      keepalive: init?.keepalive,
      mode: init?.mode,
      referrer: init?.referrer,
    };
    return expoFetch(url, expoInit);
  };
  const res = await apiFetchWith(
    `/ai/sessions/${sessionId}/messages/stream`,
    { method: 'POST', body: JSON.stringify(body) },
    streamingFetch,
  );
  if (!res.ok) throw new Error(`API ${res.status} AI stream`);
  if (!res.body) throw new Error('SSE 응답 본문이 없습니다.');
  return consumeSseStream(res.body.getReader(), callbacks);
}

export const apiDeleteChatSession = (sessionId: string) =>
  apiJson<{ ok: boolean }>(`/ai/sessions/${sessionId}`, { method: 'DELETE' });
