const visibleMs = 3600;

function setStatus(container: HTMLElement, isOnline: boolean) {
  const label = container.querySelector<HTMLElement>('[data-pwa-connection-label]');
  const nextLabel = isOnline ? container.dataset.onlineLabel : container.dataset.offlineLabel;
  const nextDescription = isOnline
    ? container.dataset.onlineDescription
    : container.dataset.offlineDescription;

  container.dataset.status = isOnline ? 'online' : 'offline';
  container.hidden = false;
  container.setAttribute('aria-label', nextDescription ?? nextLabel ?? '');

  if (label) {
    label.textContent = nextLabel ?? '';
  }
}

export function initPwaConnectionStatus() {
  const container = document.querySelector<HTMLElement>('[data-pwa-connection-status]');

  if (!container) {
    return;
  }

  let hideTimeout: number | undefined;
  const show = (isOnline: boolean) => {
    window.clearTimeout(hideTimeout);
    setStatus(container, isOnline);

    if (isOnline) {
      hideTimeout = window.setTimeout(() => {
        container.hidden = true;
      }, visibleMs);
    }
  };

  if (!navigator.onLine) {
    show(false);
  }

  window.addEventListener('online', () => show(true));
  window.addEventListener('offline', () => show(false));
}
