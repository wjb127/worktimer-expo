jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('../auth/tokenStore', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

import { consumeSseStream } from './ai';

const makeReader = (chunks: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }).getReader();
};

describe('AI SSE parser', () => {
  it('분할된 token 이벤트를 누적하고 done id를 전달한다', async () => {
    const onToken = jest.fn();
    const onDone = jest.fn();
    const onError = jest.fn();
    const source = [
      'event: token\ndata: {"text":"안녕","replace":false}\n\n',
      'event: token\ndata: {"text":"하세요","replace":false}\n\n',
      'event: done\ndata: {"userMessageId":"u1","assistantMessageId":"a1"}\n\n',
    ].join('');
    const result = await consumeSseStream(
      makeReader([source.slice(0, 41), source.slice(41, 97), source.slice(97)]),
      { onToken, onDone, onError },
    );

    expect(onToken.mock.calls).toEqual([
      ['안녕', false],
      ['하세요', false],
    ]);
    expect(onDone).toHaveBeenCalledWith({
      userMessageId: 'u1',
      assistantMessageId: 'a1',
    });
    expect(onError).not.toHaveBeenCalled();
    expect(result.assistantMessageId).toBe('a1');
  });

  it('replace 토큰을 그대로 전달한다', async () => {
    const onToken = jest.fn();
    await consumeSseStream(
      makeReader([
        'event: token\ndata: {"text":"폴백","replace":true}\n\n' +
          'event: done\ndata: {"userMessageId":"u1","assistantMessageId":"a1"}\n\n',
      ]),
      { onToken, onDone: jest.fn(), onError: jest.fn() },
    );
    expect(onToken).toHaveBeenCalledWith('폴백', true);
  });

  it('done 전에 연결이 닫히면 실패 처리한다', async () => {
    await expect(
      consumeSseStream(makeReader(['event: token\ndata: {"text":"부분"}\n\n']), {
        onToken: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      }),
    ).rejects.toThrow('완료 전에 종료');
  });
});
