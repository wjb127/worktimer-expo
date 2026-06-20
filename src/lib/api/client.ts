import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from '../auth/tokenStore';

const BASE = process.env.EXPO_PUBLIC_API_URL as string;

async function refresh(): Promise<boolean> {
  const rt = await getRefreshToken();
  if (!rt) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (res.status >= 400) {
    await clearTokens();
    return false;
  }
  const data = await res.json();
  await saveTokens(data.accessToken, data.refreshToken);
  return true;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  _retry = true,
): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401 && _retry) {
    if (await refresh()) return apiFetch(path, init, false);
  }
  return res;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(`API ${res.status} ${path}`);
  return res.json() as Promise<T>;
}
