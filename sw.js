/* Change this version whenever publishing a new complete app release. */
const VERSION = '1.1.1';
const BASE = self.registration.scope;
const PREFIX = `setline:${encodeURIComponent(BASE)}::`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = [
  './', 'index.html', 'styles.css', 'main.mjs', 'model.mjs', 'storage.mjs',
  'catalog.mjs', 'icons.mjs', 'manifest.webmanifest', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'assets/manrope-400.ttf', 'assets/manrope-500.ttf', 'assets/manrope-600.ttf', 'assets/manrope-700.ttf', 'assets/manrope-800.ttf', 'assets/muscle-arms.webp', 'assets/muscle-back.webp', 'assets/muscle-chest.webp', 'assets/muscle-core.webp', 'assets/muscle-full-body.webp', 'assets/muscle-legs.webp', 'assets/muscle-other.webp', 'assets/muscle-shoulders.webp', 'assets/platz-coaching.jpg', 'assets/sam-car.jpg',
].map(path => new URL(path, BASE).href);
const SHELL_SET = new Set(SHELL);

self.addEventListener('install', event => {
  // Installation fails safely if any part of the release is unavailable.
  // Never skip waiting here: the open workout must keep its current app code.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(url => new Request(url, {cache: 'reload'})))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== new URL(BASE).origin) return;
  const navigation = request.mode === 'navigate' && url.href.startsWith(BASE);
  if (!navigation && !SHELL_SET.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = navigation ? new URL('index.html', BASE).href : request.url;
    const cached = await cache.match(key);
    if (cached) return cached;
    // Only shell assets are ever cached. No backup, import, or workout data.
    const response = await fetch(request);
    if (response.ok && SHELL_SET.has(key)) await cache.put(key, response.clone());
    return response;
  })());
});
