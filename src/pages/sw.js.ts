import { getBasePath, joinPathSegments } from '../utils/paths';

export function GET() {
  const basePath = getBasePath();
  const serviceWorker = `
const BASE_PATH = ${JSON.stringify(basePath)};

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(clearAllCaches());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clearAllCaches(),
      self.registration.unregister(),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', () => {
  return;
});
`;

  return new Response(serviceWorker, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Service-Worker-Allowed': joinPathSegments(basePath),
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}