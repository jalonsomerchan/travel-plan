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
