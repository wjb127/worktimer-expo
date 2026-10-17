import { retryAsync } from './retry';

describe('retryAsync', () => {
  it('성공하면 바로 값을 돌려준다', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(retryAsync(fn, { delayMs: 0 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('null 도 성공한 값이다 (재시도하지 않는다)', async () => {
    const fn = jest.fn().mockResolvedValue(null);
    await expect(retryAsync(fn, { delayMs: 0 })).resolves.toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('일시적인 실패 뒤 성공하면 그 값을 돌려준다', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('잠김'))
      .mockResolvedValue('tok');
    await expect(retryAsync(fn, { delayMs: 0 })).resolves.toBe('tok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('끝까지 실패하면 마지막 에러를 던진다', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockRejectedValueOnce(new Error('3'));
    await expect(retryAsync(fn, { attempts: 3, delayMs: 0 })).rejects.toThrow(
      '3',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
