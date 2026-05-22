import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import type { ChecklistItemRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { getChecklistStatusLabel, getChecklistStatusTone, getPageTranslator } from './shared';

export interface ChecklistGroup {
  isParentTrip: boolean;
  items: ChecklistItemRecord[];
  tripId: string;
  tripName: string;
}

function getTrashIcon() {
  return `
    <svg aria-hidden="true" class="h-4 w-4" fill="none" focusable="false" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  `;
}

export function getPendingChecklistCount(groups: ChecklistGroup[]) {
  return groups.flatMap((group) => group.items).filter((item) => item.status === 'pending').length;
}

export function getCompletedChecklistCount(groups: ChecklistGroup[]) {
  return groups.flatMap((group) => group.items).filter((item) => item.status === 'completed').length;
}

export function renderChecklistGroups(locale: Locale, groups: ChecklistGroup[]) {
  const target = document.querySelector<HTMLElement>('[data-checklist-list]');
  const pendingTarget = document.querySelector<HTMLElement>('[data-checklist-pending-count]');
  const completedTarget = document.querySelector<HTMLElement>('[data-checklist-completed-count]');
  const t = getPageTranslator(locale);
  const pendingCount = getPendingChecklistCount(groups);
  const completedCount = getCompletedChecklistCount(groups);

  if (pendingTarget) {
    pendingTarget.textContent = t('tripChecklist.pendingSummary').replace('{count}', String(pendingCount));
  }

  if (completedTarget) {
    completedTarget.textContent = t('tripChecklist.completedSummary').replace('{count}', String(completedCount));
  }

  if (!target) {
    return;
  }

  if (groups.every((group) => group.items.length === 0)) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripChecklist.empty'))}</article>`;
    return;
  }

  target.innerHTML = groups
    .filter((group) => group.items.length > 0)
    .map((group) => {
      const headerLabel = group.isParentTrip ? t('tripChecklist.group.currentTrip') : t('tripChecklist.group.miniTrip');

      return `
        <section class="grid gap-4">
          <header class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(headerLabel)}</p>
              <h3 class="mt-2 text-lg font-black text-[var(--color-text)]">${escapeHtml(group.tripName)}</h3>
            </div>
            ${group.isParentTrip ? '' : `<a class="app-card-link" data-variant="secondary" href="${getAppUrl(locale, 'trip-checklist', { trip: group.tripId })}">${escapeHtml(t('tripChecklist.group.openMiniTrip'))}</a>`}
          </header>
          <div class="grid gap-4">
            ${group.items
              .map((item) => {
                const isCompleted = item.status === 'completed';

                return `
                  <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-4">
                    <div class="flex items-start justify-between gap-3">
                      <label class="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          ${isCompleted ? 'checked' : ''}
                          aria-label="${escapeHtml(
                            isCompleted ? t('tripChecklist.markPending') : t('tripChecklist.markCompleted'),
                          )}"
                          class="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                          data-checklist-toggle="${escapeHtml(item.id)}"
                          data-checklist-trip-id="${escapeHtml(group.tripId)}"
                          type="checkbox"
                        />
                        <span class="min-w-0">
                          <span class="block font-semibold text-[var(--color-text)] ${isCompleted ? 'line-through opacity-70' : ''}">
                            ${escapeHtml(item.title)}
                          </span>
                          <span class="mt-1 inline-flex">
                            <span class="status-pill" data-tone="${getChecklistStatusTone(item.status)}">${escapeHtml(
                              getChecklistStatusLabel(locale, item.status),
                            )}</span>
                          </span>
                        </span>
                      </label>
                      <button
                        aria-label="${escapeHtml(t('tripChecklist.remove'))}"
                        class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                        data-checklist-remove="${escapeHtml(item.id)}"
                        data-checklist-trip-id="${escapeHtml(group.tripId)}"
                        title="${escapeHtml(t('tripChecklist.remove'))}"
                        type="button"
                      >
                        ${getTrashIcon()}
                        <span class="sr-only">${escapeHtml(t('tripChecklist.remove'))}</span>
                      </button>
                    </div>
                  </article>
                `;
              })
              .join('')}
          </div>
        </section>
      `;
    })
    .join('');
}
