const mem: Record<string, string> = {};
const setOptions: Record<string, unknown> = {};
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 0,
  setItemAsync: jest.fn((k: string, v: string, opts?: unknown) => {
    mem[k] = v;
    setOptions[k] = opts;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
  deleteItemAsync: jest.fn((k: string) => {
    delete mem[k];
    return Promise.resolve();
  }),
}));

import * as SecureStore from 'expo-secure-store';
import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
} from './tokenStore';

const LEGACY_ACCESS = 'codeatlas.accessToken';
const LEGACY_REFRESH = 'codeatlas.refreshToken';

describe('tokenStore', () => {
  beforeEach(() => {
    Object.keys(mem).forEach((k) => delete mem[k]);
    Object.keys(setOptions).forEach((k) => delete setOptions[k]);
  });

  it('저장/조회/삭제', async () => {
    await saveTokens('acc', 'ref');
    expect(await getAccessToken()).toBe('acc');
    expect(await getRefreshToken()).toBe('ref');
    await clearTokens();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
  });

  it('이전 버전에서 저장한 토큰(옛 키)도 그대로 읽힌다', async () => {
    mem[LEGACY_ACCESS] = 'old-acc';
    mem[LEGACY_REFRESH] = 'old-ref';
    expect(await getAccessToken()).toBe('old-acc');
    expect(await getRefreshToken()).toBe('old-ref');
  });

  it('저장하면 새 키에 AFTER_FIRST_UNLOCK 으로 쓰고 옛 키는 지운다', async () => {
    mem[LEGACY_ACCESS] = 'old-acc';
    mem[LEGACY_REFRESH] = 'old-ref';
    await saveTokens('acc', 'ref');
    expect(mem[LEGACY_ACCESS]).toBeUndefined();
    expect(mem[LEGACY_REFRESH]).toBeUndefined();
    const written = Object.keys(setOptions);
    expect(written).toHaveLength(2);
    written.forEach((k) =>
      expect(setOptions[k]).toEqual({
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      }),
    );
    expect(await getAccessToken()).toBe('acc');
    expect(await getRefreshToken()).toBe('ref');
  });

  it('새 키가 옛 키보다 우선한다', async () => {
    await saveTokens('new-acc', 'new-ref');
    // 옛 키 삭제가 실패해 남아 있는 상황
    mem[LEGACY_ACCESS] = 'old-acc';
    mem[LEGACY_REFRESH] = 'old-ref';
    expect(await getAccessToken()).toBe('new-acc');
    expect(await getRefreshToken()).toBe('new-ref');
  });

  it('옛 키 삭제가 실패해도 저장은 성공한다', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('삭제 실패')),
    );
    await expect(saveTokens('acc', 'ref')).resolves.toBeUndefined();
    expect(await getAccessToken()).toBe('acc');
  });

  it('로그아웃은 새 키와 옛 키를 모두 지운다', async () => {
    await saveTokens('acc', 'ref');
    mem[LEGACY_ACCESS] = 'old-acc';
    mem[LEGACY_REFRESH] = 'old-ref';
    await clearTokens();
    expect(Object.keys(mem)).toHaveLength(0);
  });

  it('읽기 실패는 null 이 아니라 에러로 올라간다 (로그아웃으로 착각하지 않게)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('User interaction is not allowed.')),
    );
    await expect(getAccessToken()).rejects.toThrow('User interaction');
  });
});
