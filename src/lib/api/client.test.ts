jest.mock('../auth/tokenStore', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

import { apiFetch } from './client';
import * as store from '../auth/tokenStore';

const mockFetch = (responses: Array<{ status: number; body: unknown }>) => {
  let i = 0;
  global.fetch = jest.fn(() => {
    const r = responses[i++];
    return Promise.resolve({
      status: r.status,
      ok: r.status < 400,
      json: () => Promise.resolve(r.body),
    } as Response);
  }) as jest.Mock;
};

describe('apiFetch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('access 토큰을 Bearer로 붙인다', async () => {
    (store.getAccessToken as jest.Mock).mockResolvedValue('acc');
    mockFetch([{ status: 200, body: { ok: true } }]);
    await apiFetch('/me');
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers.Authorization).toBe('Bearer acc');
  });

  it('401이면 refresh 후 1회 재시도', async () => {
    (store.getAccessToken as jest.Mock)
      .mockResolvedValueOnce('old')
      .mockResolvedValue('new');
    (store.getRefreshToken as jest.Mock).mockResolvedValue('ref');
    mockFetch([
      { status: 401, body: {} },
      { status: 201, body: { accessToken: 'new', refreshToken: 'r2' } },
      { status: 200, body: { ok: true } },
    ]);
    const res = await apiFetch('/worktimer/sessions/ongoing');
    expect(res.ok).toBe(true);
    expect(store.saveTokens).toHaveBeenCalledWith('new', 'r2');
  });

  it('refresh 실패면 재시도 안 하고 401 반환', async () => {
    (store.getAccessToken as jest.Mock).mockResolvedValue('old');
    (store.getRefreshToken as jest.Mock).mockResolvedValue(null);
    mockFetch([{ status: 401, body: {} }]);
    const res = await apiFetch('/me');
    expect(res.status).toBe(401);
  });
});
