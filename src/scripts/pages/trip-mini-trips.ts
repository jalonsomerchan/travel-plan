import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripChildSummaryRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { getPageTranslator, getTripStatusLabel, getTripStatusTone } from './shared';
import { ensureListViewToggle } from './list-view-mode';

export function renderMiniTrips(locale: Locale, miniTrips: TripChildSummaryRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-mini-trip-list]');
  const count = document.querySelector<HTMLElement>('[data-mini-trip-count]');
  const t = getPageTranslator(locale);

  if (count) {
    count.textContent = t('trip.miniTrips.count').replace('{count}', String(miniTrips.length));
  }

  if (!target) {
    return;
  }

  ensureListViewToggle(locale, target);

  if (miniTrips.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.miniTrips.empty'))}</article>`;
    return;
  }

  target.innerHTML = miniTrips
    .map((trip) => {
      const tripUrl = getAppUrl(locale, 'trip', { trip: trip.id });

      return `
        <article class="app-card-shell" data-list-card>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <a class="inline-flex items-center gap-2" href="${tripUrl}">
                <h3 class="text-lg font-bold text-[var(--color-text)]">${escapeHtml(trip.name)}</h3>
              </a>
              <p class="mt-2 text-sm text-[var(--color-text-soft)]" data-list-detail>${escapeHtml(trip.location)}</p>
            </div>
            <span class="status-pill" data-list-detail data-tone="${getTripStatusTone(trip.status)}">${escapeHtml(getTripStatusLabel(locale, trip.status))}</span>
          </div>
          <p class="mt-4 text-sm text-[var(--color-text-muted)]" data-list-detail>${escapeHtml(formatDateRange(trip.startDate, trip.endDate, locale))}</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <a class="app-card-link" href="${tripUrl}">${escapeHtml(t('trip.miniTrips.open'))}</a>
            <a class="app-card-link" data-variant="secondary" href="${getAppUrl(locale, 'trip-checklist', { trip: trip.id })}">${escapeHtml(t('trip.miniTrips.openChecklist'))}</a>
          </div>
        </article>
      `;
    })
    .join('');
}
