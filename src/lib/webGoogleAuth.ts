// 웹(PWA) 구글 로그인 — Google Identity Services(GIS).
//
// 왜 GIS인가: @react-native-google-signin은 네이티브 SDK라 웹에 없다. 웹에서
// id_token을 받는 표준 경로가 GIS이고, 이때 id_token의 aud/azp는 **웹 클라이언트 ID**다.
// 서버 registry(worktimer.googleAudienceEnvs)에 GOOGLE_WEB_CLIENT_ID가 이미
// 들어 있어서 서버는 손댈 게 없다.
//
// 필요한 준비는 GCP 웹 클라이언트의 "승인된 JavaScript 원본"에 배포 도메인을
// 추가하는 것 하나뿐이다(원본이 없으면 GIS가 버튼 렌더 자체를 거부한다).

const GSI_SRC = 'https://accounts.google.com/gsi/client';

type CredentialResponse = { credential?: string };

type GsiId = {
  initialize: (opts: {
    client_id: string;
    callback: (res: CredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, opts: Record<string, unknown>) => void;
};

function gsi(): GsiId | null {
  const g = (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google;
  return g?.accounts?.id ?? null;
}

let scriptPromise: Promise<void> | null = null;

/** GIS 스크립트를 한 번만 로드한다(중복 로드 시 initialize가 꼬인다). */
function loadGsi(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (gsi()) return resolve();
    const el = document.createElement('script');
    el.src = GSI_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => (gsi() ? resolve() : reject(new Error('GIS 초기화 실패')));
    el.onerror = () => reject(new Error('구글 스크립트를 불러오지 못했어요.'));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

export function webGoogleClientId(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
}

/**
 * 주어진 컨테이너에 구글 공식 버튼을 렌더한다.
 * 커스텀 버튼을 코드로 클릭하는 우회는 쓰지 않는다 — GIS가 그 경로를 막고 있고,
 * 막히면 "눌러도 반응 없음"이 되어 이번에 고친 문제가 그대로 재발한다.
 *
 * onCredential은 id_token(JWT)을 받는다. 그대로 /auth/google에 넘기면 된다.
 */
export async function renderGoogleButton(
  parent: HTMLElement,
  onCredential: (idToken: string) => void,
  onError: (message: string) => void,
): Promise<void> {
  const clientId = webGoogleClientId();
  if (!clientId) {
    onError('구글 클라이언트 ID가 설정되지 않았어요.');
    return;
  }
  try {
    await loadGsi();
  } catch (e) {
    onError(String((e as Error)?.message ?? e));
    return;
  }
  const id = gsi();
  if (!id) {
    onError('구글 로그인을 초기화하지 못했어요.');
    return;
  }

  id.initialize({
    client_id: clientId,
    // popup: 리다이렉트로 앱 상태를 잃지 않는다(SPA라 되돌아올 라우트가 없다).
    ux_mode: 'popup',
    auto_select: false,
    callback: (res) => {
      if (res?.credential) onCredential(res.credential);
      else onError('구글에서 인증 정보를 받지 못했어요.');
    },
  });

  parent.innerHTML = '';
  id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    locale: 'ko',
    width: 280,
  });
}
