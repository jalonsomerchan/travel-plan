import { getBasePath, withBasePath } from '../../utils/paths';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(withBasePath('sw.js'), {
        scope: getBasePath(),
      })
      .catch((error) => {
        console.warn('serviceWorker.register', error);
      });
  });
}
