export function escapeHtml(value: string | undefined) {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function setMessage(
  target: HTMLElement | null,
  message: string,
  tone: 'default' | 'success' | 'danger' = 'default',
) {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.dataset.tone = tone;
}

export function setButtonBusy(
  button: HTMLButtonElement | null,
  busy: boolean,
  idleLabel: string,
  busyLabel: string,
) {
  if (!button) {
    return;
  }

  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

const snackbarTimers = new WeakMap<HTMLElement, number>();

export function showSnackbar(
  target: HTMLElement | null,
  message: string,
  tone: 'default' | 'success' | 'danger' = 'success',
  duration = 3200,
) {
  if (!target) {
    return;
  }

  const previousTimer = snackbarTimers.get(target);

  if (previousTimer) {
    window.clearTimeout(previousTimer);
  }

  target.textContent = message;
  target.dataset.tone = tone;
  target.hidden = false;
  target.dataset.open = 'true';

  const timer = window.setTimeout(() => {
    target.hidden = true;
    target.dataset.open = 'false';
  }, duration);

  snackbarTimers.set(target, timer);
}
