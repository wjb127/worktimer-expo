// PWA 설치 요건 배선 — 웹에서만 동작한다.
//
// Expo 웹 익스포트가 만드는 index.html에는 manifest 링크가 없다. 템플릿을 갈아끼우는
// 대신 런타임에 <head>를 채운다 — 브라우저는 로드 이후에 설치 가능 여부를 평가하므로
// 이 시점 주입으로 충분하고, Expo 템플릿 변경에 묶이지 않는다.
//
// 서비스워커는 설치 가능 요건이자 오프라인 앱 셸이다. 등록 실패는 앱 동작에
// 영향을 주면 안 되므로 전부 삼킨다(설치가 안 될 뿐, 앱은 정상).
import { Platform } from 'react-native';

function ensureHeadLink(rel: string, href: string, extra?: Record<string, string>) {
  const existing = document.querySelector(`link[rel="${rel}"]`);
  if (existing) return;
  const el = document.createElement('link');
  el.rel = rel;
  el.href = href;
  if (extra) for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
  document.head.appendChild(el);
}

function ensureMeta(name: string, content: string) {
  if (document.querySelector(`meta[name="${name}"]`)) return;
  const el = document.createElement('meta');
  el.name = name;
  el.content = content;
  document.head.appendChild(el);
}

export function setupPwa(): void {
  if (Platform.OS !== 'web') return;
  if (typeof document === 'undefined') return;

  ensureHeadLink('manifest', '/manifest.webmanifest');
  // iOS/iPadOS는 manifest의 아이콘을 홈화면에 쓰지 않는다 — 이 링크가 필요하다.
  ensureHeadLink('apple-touch-icon', '/icon-192.png');
  ensureMeta('theme-color', '#2563eb');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-title', '필타임');

  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록 실패는 무시한다. 설치가 안 될 뿐 앱은 정상 동작해야 한다.
    });
  };

  // 초기 렌더와 네트워크를 다투지 않게 load 이후에 등록하되,
  // **이미 load가 지나갔으면 즉시 등록**한다. setupPwa는 React 마운트(useEffect)에서
  // 불리는데 그 시점엔 load가 이미 끝나 있는 경우가 많아서, 리스너만 달면
  // 영영 등록되지 않는다(실측: 등록 0건 → 설치 불가).
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
