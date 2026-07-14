import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from '../auth/tokenStore';

// API base URL — 누락 시 조용한 `undefined${path}` 요청 대신 명확히 throw (fail-fast).
function getBase(): string {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) {
    throw new Error(
      '[config] EXPO_PUBLIC_API_URL이 설정되지 않았습니다. .env 또는 EAS 빌드 env를 확인하세요.',
    );
  }
  return base;
}

// refresh 토큰까지 만료/무효일 때 호출 — AuthContext가 등록해 앱 전체 signedOut 전파.
// (없으면 무한 401 + 빈화면 상태에 갇힘)
let onAuthExpired: (() => void) | null = null;
export function setAuthExpiredHandler(handler: (() => void) | null): void {
  onAuthExpired = handler;
}

// 진행 중인 refresh 하나를 공유(single-flight). 동시 401들이 각자 refresh를
// 발사하면 백엔드의 원자적 회전(재사용 탐지)에 의해 두 번째부터 거부돼
// 정상 유저가 오로그아웃된다 → 한 번만 실행하고 결과를 모두가 공유.
let refreshInFlight: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const rt = await getRefreshToken();
  if (!rt) {
    onAuthExpired?.();
    return false;
  }
  const res = await fetch(`${getBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (res.status >= 400) {
    await clearTokens();
    onAuthExpired?.();
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
  const res = await fetch(`${getBase()}${path}`, {
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
