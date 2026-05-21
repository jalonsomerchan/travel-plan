import { getBasePath, joinPathSegments } from '../utils/paths';

export function GET() {
  const basePath = getBasePath();
  const serviceWorker = `
const VERSION = 'travel-plan-pwa-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
