import { getBasePath, joinPathSegments, withBasePath } from '../utils/paths';

export function GET() {
  const basePath = getBasePath();
  const shellUrls = [
    withBasePath(''),
    withBasePath('app/'),
    withBasePath('app/trip/'),
    withBasePath('app/plan/'),
    withBasePath('app/calendar/'),
    withBasePath('app/map/'),
    withBasePath('app/trip-checklist/'),
    withBasePath('app/trip-luggage/'),
    withBasePath('app/trip-weather/'),
    withBasePath('app/trip-accommodation/'),
    withBasePath('app/trip-pois/'),
    withBasePath('manifest.webmanifest'),
    withBasePath('favicon.svg'),
  ];
  const serviceWorker = `
const CACHE_NAME = 'travel-plan-shell-v4';
const BASE_PATH = ${JSON.stringify(basePath)};
const SHELL_URLS = ${JSON.stringify(shellUrls)};

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isInsideScope(request) {
  const pathname = new URL(request.url).pathname;
  return BASE_PATH === '/' || pathname === BASE_PATH || pathname.startsWith(BASE_PATH);
}

function getUrlWithoutSearch(request) {
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function putIfOk(cache, request, response) {
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function matchNavigationFallback(cache, request) {
  return (
    (await cache.match(request)) ||
    (await cache.match(getUrlWithoutSearch(request))) ||
    (await cache.match(SHELL_URLS[1])) ||
    cache.match(SHELL_URLS[0])
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    return await putIfOk(cache, request, await fetch(request));
  } catch {
    return matchNavigationFallback(cache, request);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) return cached;

  return putIfOk(cache, request, await fetch(request));
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
    event.respondWith(networkFirst(request));
    return;
  }

  if (['script', 'style', 'manifest'].includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (['image', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
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
