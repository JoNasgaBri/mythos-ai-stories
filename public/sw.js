// MYTHOS PWA Service Worker v2 — Offline Reading + Smart Asset Caching + Controlled Updates
const SHELL_CACHE = 'mythos-shell-v2';
const RUNTIME_CACHE = 'mythos-runtime-v2';
const FONT_CACHE = 'mythos-fonts-v2';
const ACTIVE_CACHES = new Set([SHELL_CACHE, RUNTIME_CACHE, FONT_CACHE]);

const SHELL_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(
          SHELL_PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })),
          ),
        ),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ACTIVE_CACHES.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept API endpoints, PeerJS signaling, or non-http(s) schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname.includes('peerjs.com')) return;

  // Google Fonts: Stale-While-Revalidate so offline reading keeps full typography
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      }),
    );
    return;
  }

  // Only handle same-origin assets & navigations below
  if (url.origin !== self.location.origin) return;

  // SPA navigation requests: Network-First with guaranteed /index.html offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches
              .open(SHELL_CACHE)
              .then((cache) => cache.put('/index.html', clone))
              .catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const shell = await caches.open(SHELL_CACHE);
          return (
            (await shell.match(req)) ||
            (await shell.match('/index.html')) ||
            (await shell.match('/'))
          );
        }),
    );
    return;
  }

  // Hashed Vite assets (/assets/*): Cache-First for instant cold start & offline reliability
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.status === 200 && res.type === 'basic') {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      }),
    );
    return;
  }

  // Other same-origin static files (icons, manifest, etc.): Network-First + cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put(req, clone))
            .catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
