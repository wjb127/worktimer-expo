// 필타임 PWA 서비스워커 — 설치 가능(installability) 요건 충족 + 앱 셸 캐시.
//
// 의도적으로 좁게 만든다:
//  - **API 응답은 절대 캐시하지 않는다.** 서버가 진실인 앱이라, 오래된 세션/할일이
//    캐시에서 나오면 사용자가 잘못된 시간을 보고 잘못 기록한다. 캐시 미스보다
//    오염된 데이터가 훨씬 나쁘다.
//  - 캐시 대상은 정적 앱 셸(문서·JS·이미지·폰트)뿐이다.
//  - 문서는 network-first — 새 배포를 즉시 받게. 오프라인일 때만 캐시로 떨어진다.
//  - 정적 자산은 파일명에 해시가 박혀 있어 cache-first가 안전하다.

const VERSION = 'filltime-v1';
const SHELL = `${VERSION}-shell`;

self.addEventListener('install', (event) => {
  // 새 워커가 즉시 다음 로드부터 일하도록. 셸은 아래 fetch에서 lazily 채운다.
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|png|jpg|jpeg|svg|webp|ttf|woff2?|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 외부 오리진(우리 API·구글 GIS 등)은 손대지 않는다.
  // 특히 API를 캐시하면 잘못된 기록을 보여주게 된다.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL);
          cache.put('/', fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match('/');
          if (cached) return cached;
          throw new Error('offline and no cached shell');
        }
      })(),
    );
    return;
  }

  if (!isStaticAsset(url)) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh.ok) {
        const cache = await caches.open(SHELL);
        cache.put(req, fresh.clone());
      }
      return fresh;
    })(),
  );
});
