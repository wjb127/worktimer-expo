// 일시적인 실패(키체인 잠김 등)를 짧게 다시 시도한다.
// 마지막 실패는 그대로 던진다 — 호출부가 '값 없음(null)'과 '읽기 실패'를 구분해야 하기 때문.
export async function retryAsync<T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 500 }: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
