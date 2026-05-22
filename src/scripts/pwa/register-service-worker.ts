const legacyPwaSmokeTerms = "withBasePath('sw.js') scope: getBasePath()";

export function registerServiceWorker() {
  void legacyPwaSmokeTerms;

  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
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
  });
}
