import { getBasePath, joinPathSegments, withBasePath } from '../utils/paths';

export function GET() {
  const basePath = getBasePath();
  const shellUrls = [withBasePath(''), withBasePath('manifest.webmanifest'), withBasePath('favicon.svg')];
  const serviceWorker = `
const CACHE_NAME = 'travel-plan-shell-v2';
const BASE_PATH = ${JSON.stringify(basePath)};
const SHELL_URLS = ${JSON.stringify(shellUrls)};

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isInsideScope(request) {
  const pathname = new URL(request.url).pathname;
  return BASE_PATH === '/' || pathname === BASE_PATH || pathname.startsWith(BASE_PATH);
}

async function putIfOk(cache, request, response) {
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET' || !isSameOrigin(request) || !isInsideScope(request)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          return await putIfOk(cache, request, await fetch(request));
        } catch {
          return (await cache.match(request)) || cache.match(SHELL_URLS[0]);
        }
      }),
    );
    return;
  }

  if (['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        return putIfOk(cache, request, await fetch(request));
      }),
    );
  }
});
`;

  return new Response(serviceWorker, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Service-Worker-Allowed': joinPathSegments(basePath),
      'Cache-Control': 'no-cache',
    },
  });
}
