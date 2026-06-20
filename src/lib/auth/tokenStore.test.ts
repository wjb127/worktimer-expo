const mem: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((k: string, v: string) => {
    mem[k] = v;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
  deleteItemAsync: jest.fn((k: string) => {
    delete mem[k];
    return Promise.resolve();
  }),
}));

import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
} from './tokenStore';

describe('tokenStore', () => {
  beforeEach(() => Object.keys(mem).forEach((k) => delete mem[k]));

  it('저장/조회/삭제', async () => {
    await saveTokens('acc', 'ref');
    expect(await getAccessToken()).toBe('acc');
    expect(await getRefreshToken()).toBe('ref');
    await clearTokens();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
  });
});
