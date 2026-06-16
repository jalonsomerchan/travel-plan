import type { Locale } from '../../config/site';
import {
  getDestinationLinkCategoryKey,
  normalizeDestinationLinkInput,
  validateDestinationLink,
} from '../../lib/app/destination-links';
import type {
  DestinationLinkInput,
  DestinationLinkRecord,
  TripMemberRecord,
  TripRecord,
} from '../../lib/app/models';
import {
  createTripDestinationLink,
  deleteTripDestinationLink,
  updateTripDestinationLink,
} from '../../lib/firebase/destination-links';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip, subscribeTripMembers } from '../../lib/firebase/trips';
import { getPageTranslator } from './shared';

const inputClass = 'min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-base text-[var(--color-text)]';
const labelClass = 'grid gap-2 text-sm font-semibold text-[var(--color-text-muted)]';
const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm font-bold text-[var(--color-text)]';

interface DestinationLinksState {
  links: DestinationLinkRecord[];
  trip: TripRecord | null;
  members: TripMemberRecord[];
  userId: string;
  editingId: string;
}

function userCanEditTrip(state: DestinationLinksState) {
  return Boolean(
    state.userId &&
      state.trip &&
      (state.trip.ownerId === state.userId ||
        state.members.some((member) =>
          member.role === 'editor' && (member.userId === state.userId || member.id === state.userId),
        )),
  );
}

function getFormInput(form: HTMLFormElement, name: string) {
  return form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
}

function readForm(form: HTMLFormElement): DestinationLinkInput {
  return normalizeDestinationLinkInput({
    title: getFormInput(form, 'title')?.value ?? '',
    url: getFormInput(form, 'url')?.value ?? '',
    category: getFormInput(form, 'category')?.value ?? '',
    notes: getFormInput(form, 'notes')?.value ?? '',
  });
}

function appendText(parent: HTMLElement, tagName: string, className: string, text: string) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function appendField(form: HTMLFormElement, label: string, name: string, placeholder: string, multiline = false) {
  const wrapper = document.createElement('label');
  const caption = document.createElement('span');
  const field = multiline ? document.createElement('textarea') : document.createElement('input');

  wrapper.className = labelClass;
  caption.textContent = label;
  field.className = multiline ? `${inputClass} min-h-24 py-2` : inputClass;
  field.setAttribute('name', name);
  field.setAttribute('placeholder', placeholder);

  if (!multiline) {
    (field as HTMLInputElement).type = name === 'url' ? 'url' : 'text';
  }

  if (name === 'title') field.setAttribute('required', '');
  if (name === 'url') field.setAttribute('required', '');
  if (name === 'title') field.setAttribute('maxlength', '90');
  if (name === 'category') field.setAttribute('maxlength', '50');
  if (name === 'notes') field.setAttribute('maxlength', '280');
  if (name === 'url') field.setAttribute('inputmode', 'url');

  wrapper.append(caption, field);
  form.append(wrapper);
}

function ensureSection(locale: Locale) {
  const existing = document.querySelector<HTMLElement>('[data-destination-links-section]');
  if (existing) return existing;

  const t = getPageTranslator(locale);
  const planPanel = document.querySelector<HTMLElement>('[data-trip-panel="plans"]');
  const section = document.createElement('section');
  const header = document.createElement('div');
  const editor = document.createElement('div');
  const form = document.createElement('form');
  const buttons = document.createElement('div');
  const submit = document.createElement('button');
  const cancel = document.createElement('button');
  const feedback = document.createElement('p');
  const list = document.createElement('div');

  section.className = 'mb-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-xs)] sm:p-5';
  section.setAttribute('data-destination-links-section', '');
  section.hidden = true;
  header.className = 'min-w-0';
  appendText(header, 'p', 'text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-soft)]', t('destinationLinks.eyebrow'));
  appendText(header, 'h2', 'mt-2 break-words text-2xl font-black text-[var(--color-text)] [overflow-wrap:anywhere]', t('destinationLinks.title'));
  appendText(header, 'p', 'mt-2 max-w-3xl text-sm text-[var(--color-text-soft)]', t('destinationLinks.helper'));

  editor.className = 'mt-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4';
  editor.dataset.destinationLinksEditor = '';
  editor.hidden = true;
  appendText(editor, 'h3', 'text-base font-black text-[var(--color-text)]', t('destinationLinks.formTitle')).dataset.destinationLinkFormTitle = '';

  form.className = 'mt-4 grid gap-4';
  form.dataset.destinationLinkForm = '';
  form.noValidate = true;
  appendField(form, t('destinationLinks.titleLabel'), 'title', t('destinationLinks.titlePlaceholder'));
  appendField(form, t('destinationLinks.urlLabel'), 'url', t('destinationLinks.urlPlaceholder'));
  appendField(form, t('destinationLinks.categoryLabel'), 'category', t('destinationLinks.categoryPlaceholder'));
  appendField(form, t('destinationLinks.notesLabel'), 'notes', t('destinationLinks.notesPlaceholder'), true);

  buttons.className = 'flex flex-wrap items-center gap-3';
  submit.className = 'app-card-link';
  submit.dataset.destinationLinkSubmit = '';
  submit.type = 'submit';
  submit.textContent = t('destinationLinks.save');
  cancel.className = buttonClass;
  cancel.dataset.destinationLinkCancel = '';
  cancel.type = 'button';
  cancel.hidden = true;
  cancel.textContent = t('destinationLinks.cancelEdit');
  buttons.append(submit, cancel);
  form.append(buttons);
  editor.append(form);

  feedback.className = 'sr-only';
  feedback.dataset.destinationLinksFeedback = '';
  feedback.setAttribute('aria-live', 'polite');
  list.className = 'mt-5 grid gap-4';
  list.dataset.destinationLinksList = '';
  section.append(header, editor, feedback, list);
  planPanel?.parentElement?.insertBefore(section, planPanel);

  return section;
}

function resetForm(locale: Locale, section: HTMLElement, state: DestinationLinksState) {
  const t = getPageTranslator(locale);
  const form = section.querySelector<HTMLFormElement>('[data-destination-link-form]');
  const cancel = section.querySelector<HTMLButtonElement>('[data-destination-link-cancel]');
  const submit = section.querySelector<HTMLButtonElement>('[data-destination-link-submit]');
  const title = section.querySelector<HTMLElement>('[data-destination-link-form-title]');

  state.editingId = '';
  form?.reset();
  if (title) title.textContent = t('destinationLinks.formTitle');
  if (submit) submit.textContent = t('destinationLinks.save');
  if (cancel) cancel.hidden = true;
}

function setFeedback(section: HTMLElement, message: string) {
  const feedback = section.querySelector<HTMLElement>('[data-destination-links-feedback]');
  if (feedback) feedback.textContent = message;
}

function renderLink(locale: Locale, link: DestinationLinkRecord, canEdit: boolean) {
  const t = getPageTranslator(locale);
  const article = document.createElement('article');
  const anchor = document.createElement('a');
  article.className = 'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4';
  anchor.className = 'break-words text-base font-black text-[var(--color-primary)] underline-offset-4 hover:underline [overflow-wrap:anywhere]';
  anchor.href = link.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = link.title;
  article.append(anchor);

  if (link.notes) appendText(article, 'p', 'mt-2 break-words text-sm text-[var(--color-text-muted)] [overflow-wrap:anywhere]', link.notes);

  if (canEdit) {
    const actions = document.createElement('div');
    const edit = document.createElement('button');
    const remove = document.createElement('button');
    actions.className = 'mt-4 flex flex-wrap items-center gap-2';
    actions.setAttribute('aria-label', t('destinationLinks.actions'));
    edit.className = buttonClass;
    edit.type = 'button';
    edit.dataset.destinationLinkEdit = link.id;
    edit.textContent = t('destinationLinks.edit');
    remove.className = buttonClass;
    remove.type = 'button';
    remove.dataset.destinationLinkDelete = link.id;
    remove.textContent = t('destinationLinks.delete');
    actions.append(edit, remove);
    article.append(actions);
  }

  return article;
}

function render(locale: Locale, section: HTMLElement, state: DestinationLinksState) {
  const t = getPageTranslator(locale);
  const list = section.querySelector<HTMLElement>('[data-destination-links-list]');
  const editor = section.querySelector<HTMLElement>('[data-destination-links-editor]');
  const canEdit = userCanEditTrip(state);
  const safeLinks = state.links.filter((link) => validateDestinationLink(link).valid);

  section.hidden = !state.trip;
  if (editor) editor.hidden = !canEdit;
  if (!list) return;
  list.replaceChildren();

  if (safeLinks.length === 0) {
    appendText(list, 'article', 'rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-6 text-center text-sm text-[var(--color-text-soft)]', t('destinationLinks.empty'));
    return;
  }

  const groups = new Map<string, DestinationLinkRecord[]>();
  safeLinks.forEach((link) => {
    const key = getDestinationLinkCategoryKey(link);
    groups.set(key, [...(groups.get(key) ?? []), link]);
  });

  groups.forEach((links, category) => {
    const group = document.createElement('section');
    const grid = document.createElement('div');
    group.className = 'grid gap-3';
    group.setAttribute('aria-label', category || t('destinationLinks.uncategorized'));
    appendText(group, 'h3', 'text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-soft)]', category || t('destinationLinks.uncategorized'));
    grid.className = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3';
    links.forEach((link) => grid.append(renderLink(locale, link, canEdit)));
    group.append(grid);
    list.append(group);
  });
}

function fillForm(locale: Locale, section: HTMLElement, state: DestinationLinksState, link: DestinationLinkRecord) {
  const t = getPageTranslator(locale);
  const form = section.querySelector<HTMLFormElement>('[data-destination-link-form]');
  if (!form) return;
  state.editingId = link.id;
  section.querySelector<HTMLElement>('[data-destination-link-form-title]')!.textContent = t('destinationLinks.formTitleEdit');
  section.querySelector<HTMLButtonElement>('[data-destination-link-submit]')!.textContent = t('destinationLinks.saveEdit');
  section.querySelector<HTMLButtonElement>('[data-destination-link-cancel]')!.hidden = false;
  getFormInput(form, 'title')!.value = link.title;
  getFormInput(form, 'url')!.value = link.url;
  getFormInput(form, 'category')!.value = link.category ?? '';
  getFormInput(form, 'notes')!.value = link.notes ?? '';
  getFormInput(form, 'title')?.focus();
}

export function mountTripDestinationLinks({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  if (!tripId) return;

  const section = ensureSection(locale);
  const form = section.querySelector<HTMLFormElement>('[data-destination-link-form]');
  const list = section.querySelector<HTMLElement>('[data-destination-links-list]');
  const cancel = section.querySelector<HTMLButtonElement>('[data-destination-link-cancel]');
  const t = getPageTranslator(locale);
  const subscriptions = createSubscriptionScope();
  const state: DestinationLinksState = { links: [], trip: null, members: [], userId: '', editingId: '' };
  const sync = () => render(locale, section, state);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!userCanEditTrip(state) || !form) return;
    const input = readForm(form);
    const validation = validateDestinationLink(input);
    if (!validation.valid && validation.errorKey) {
      setFeedback(section, t(validation.errorKey));
      return;
    }
    try {
      if (state.editingId) await updateTripDestinationLink(tripId, state.editingId, input);
      else await createTripDestinationLink(tripId, input);
      setFeedback(section, t('destinationLinks.saved'));
      resetForm(locale, section, state);
    } catch {
      setFeedback(section, t('destinationLinks.error.save'));
    }
  });

  cancel?.addEventListener('click', () => resetForm(locale, section, state));
  list?.addEventListener('click', async (event) => {
    if (!(event.target instanceof HTMLElement) || !userCanEditTrip(state)) return;
    const edit = event.target.closest<HTMLElement>('[data-destination-link-edit]');
    if (edit) {
      const link = state.links.find((item) => item.id === edit.dataset.destinationLinkEdit);
      if (link) fillForm(locale, section, state, link);
      return;
    }
    const remove = event.target.closest<HTMLElement>('[data-destination-link-delete]');
    const linkId = remove?.dataset.destinationLinkDelete ?? '';
    if (!linkId || !window.confirm(t('destinationLinks.deleteConfirm'))) return;
    try {
      await deleteTripDestinationLink(tripId, linkId);
      setFeedback(section, t('destinationLinks.deleted'));
      resetForm(locale, section, state);
    } catch {
      setFeedback(section, t('destinationLinks.error.delete'));
    }
  });

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });
  observeSession((user) => {
    subscriptions.clear();
    state.links = [];
    state.trip = null;
    state.members = [];
    state.userId = user?.uid ?? '';
    resetForm(locale, section, state);
    sync();
    if (!user) return;
    subscriptions.add(subscribeTrip(tripId, (trip) => {
      state.trip = trip;
      state.links = trip?.destinationLinks ?? [];
      sync();
    }));
    subscriptions.add(subscribeTripMembers(tripId, (members) => { state.members = members; sync(); }));
  });
}
