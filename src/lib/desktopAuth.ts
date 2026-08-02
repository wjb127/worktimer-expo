// 데스크탑(Tauri) 전용 인증 브리지.
//
// 웹 번들에는 구글 네이티브 SDK가 없고, 구글은 임베디드 웹뷰 안의 OAuth를 차단한다
// (disallowed_useragent). 그래서 데스크탑에서는 Rust 쪽이 시스템 브라우저 +
// 루프백 리다이렉트 + PKCE로 로그인을 끝내고, 여기서는 그 결과만 받는다.
//
// 모바일 번들에서는 이 파일의 어떤 코드도 실행되지 않는다(isDesktop()이 항상 false).
import { Platform } from 'react-native';

type TauriGlobal = {
  core?: { invoke?: (cmd: string, args?: unknown) => Promise<unknown> };
};

function tauri(): TauriGlobal | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  const g = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
  return g ?? null;
}

/** Tauri 데스크탑 앱 안에서 실행 중인가 (브라우저에서 연 웹과 구분) */
export function isDesktop(): boolean {
  return Boolean(tauri()?.core?.invoke);
}

export type TokenPair = { accessToken: string; refreshToken: string };

/**
 * 데스크탑 구글 로그인. 시스템 브라우저가 열리고, 사용자가 동의를 마치면 해소된다.
 * 취소·실패는 사람이 읽을 수 있는 메시지로 reject된다(Rust가 그대로 문자열을 준다).
 */
export async function desktopGoogleSignIn(): Promise<TokenPair> {
  const invoke = tauri()?.core?.invoke;
  if (!invoke) throw new Error('데스크탑 앱에서만 사용할 수 있어요.');
  const pair = (await invoke('google_sign_in')) as TokenPair;
  if (!pair?.accessToken || !pair?.refreshToken) {
    throw new Error('로그인 응답이 올바르지 않아요.');
  }
  return pair;
}
