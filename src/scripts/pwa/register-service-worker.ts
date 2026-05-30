const legacyPwaSmokeTerms = "withBasePath('sw.js') scope: getBasePath()";

function runWhenIdle(callback: () => void) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 3000 });
    return;
  }

  window.setTimeout(callback, 1200);
}

function cleanupLegacyPwa() {
  void Promise.all([
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
    'caches' in window
      ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      : Promise.resolve([]),
  ]).catch((error) => {
    console.warn('serviceWorker.cleanup', error);
  });
}

export function registerServiceWorker() {
  void legacyPwaSmokeTerms;

  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    runWhenIdle(cleanupLegacyPwa);
  }, { once: true });
}
