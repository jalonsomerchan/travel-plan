import type { PlanLinkRecord } from '../../lib/app/models';

function assignRowIds(row: HTMLElement, index: number, prefix: string) {
  const labelInput = row.querySelector<HTMLInputElement>('[data-plan-link-label-input]');
  const urlInput = row.querySelector<HTMLInputElement>('[data-plan-link-url-input]');
  const label = row.querySelector<HTMLLabelElement>('[data-plan-link-label-for]');
  const urlLabel = row.querySelector<HTMLLabelElement>('[data-plan-link-url-for]');

  if (labelInput && label) {
    labelInput.id = `${prefix}-link-${index}-label`;
    label.setAttribute('for', labelInput.id);
  }

  if (urlInput && urlLabel) {
    urlInput.id = `${prefix}-link-${index}-url`;
    urlLabel.setAttribute('for', urlInput.id);
  }
}

function getLinksList(form: HTMLFormElement) {
  return form.querySelector<HTMLElement>('[data-plan-links-list]');
}

function getTemplate(form: HTMLFormElement) {
  return form.querySelector<HTMLTemplateElement>('[data-plan-link-template]');
}

function getPrefix(form: HTMLFormElement) {
  return form.querySelector<HTMLInputElement>('[data-plan-links-prefix]')?.value || 'plan';
}

function refreshRows(form: HTMLFormElement) {
  const prefix = getPrefix(form);

  form.querySelectorAll<HTMLElement>('[data-plan-link-row]').forEach((row, index) => {
    assignRowIds(row, index, prefix);
  });
}

export function addPlanLinkRow(form: HTMLFormElement, link: Partial<PlanLinkRecord> = {}) {
  const list = getLinksList(form);
  const template = getTemplate(form);

  if (!list || !template) {
    return null;
  }

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const row = fragment.querySelector<HTMLElement>('[data-plan-link-row]');

  if (!row) {
    return null;
  }

  const labelInput = row.querySelector<HTMLInputElement>('[data-plan-link-label-input]');
  const urlInput = row.querySelector<HTMLInputElement>('[data-plan-link-url-input]');
  const removeButton = row.querySelector<HTMLButtonElement>('[data-plan-link-remove]');

  if (labelInput) labelInput.value = link.label ?? '';
  if (urlInput) urlInput.value = link.url ?? '';
  removeButton?.addEventListener('click', () => {
    row.remove();
    refreshRows(form);
  });

  list.append(row);
  refreshRows(form);

  return row;
}

export function setPlanLinkRows(form: HTMLFormElement, links: PlanLinkRecord[]) {
  const list = getLinksList(form);

  if (!list) {
    return;
  }

  list.innerHTML = '';
  links.forEach((link) => addPlanLinkRow(form, link));
}

export function initPlanLinksFields(form: HTMLFormElement) {
  const addButton = form.querySelector<HTMLButtonElement>('[data-plan-link-add]');

  addButton?.addEventListener('click', () => {
    const row = addPlanLinkRow(form);
    row?.querySelector<HTMLInputElement>('[data-plan-link-label-input]')?.focus();
  });
}
