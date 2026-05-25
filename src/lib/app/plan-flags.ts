import { escapeHtml } from './dom';
import type { PlanInput, PlanRecord } from './models';

interface TranslateFn {
  (key: string): string;
}

type PlanFlagFields = Pick<PlanRecord | PlanInput, 'isPaid' | 'isBooked' | 'needsReservation' | 'isOptional' | 'isImportant'>;

function getPlanFlags(plan: PlanFlagFields) {
  return [
    plan.isPaid
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-sm font-black text-[var(--color-success)]" aria-label="paid" title="paid">$</span>`
      : '',
    plan.isBooked
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-black text-[var(--color-primary)]" aria-label="booked" title="booked">✓</span>`
      : '',
    plan.needsReservation
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-warning-soft)] text-sm font-black text-[var(--color-warning)]" aria-label="reservation required" title="reservation required">R</span>`
      : '',
    plan.isOptional
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-sm font-black text-[var(--color-text-soft)]" aria-label="optional" title="optional">?</span>`
      : '',
    plan.isImportant
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-danger-soft)] text-sm font-black text-[var(--color-danger)]" aria-label="important" title="important">!</span>`
      : '',
  ].filter(Boolean);
}

export function getPlanFlagsHtml(plan: PlanFlagFields, t: TranslateFn) {
  const labels = {
    paid: escapeHtml(t('plan.flag.paid')),
    booked: escapeHtml(t('plan.flag.booked')),
    needsReservation: escapeHtml(t('plan.flag.needsReservation')),
    optional: escapeHtml(t('plan.flag.optional')),
    important: escapeHtml(t('plan.flag.important')),
  };

  return [
    plan.isPaid
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-sm font-black text-[var(--color-success)]" aria-label="${labels.paid}" title="${labels.paid}">$</span>`
      : '',
    plan.isBooked
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-black text-[var(--color-primary)]" aria-label="${labels.booked}" title="${labels.booked}">✓</span>`
      : '',
    plan.needsReservation
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-warning-soft)] text-sm font-black text-[var(--color-warning)]" aria-label="${labels.needsReservation}" title="${labels.needsReservation}">R</span>`
      : '',
    plan.isOptional
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-sm font-black text-[var(--color-text-soft)]" aria-label="${labels.optional}" title="${labels.optional}">?</span>`
      : '',
    plan.isImportant
      ? `<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-danger-soft)] text-sm font-black text-[var(--color-danger)]" aria-label="${labels.important}" title="${labels.important}">!</span>`
      : '',
  ]
    .filter(Boolean)
    .join('');
}

export function getPlanNameWithFlagsHtml(
  plan: Pick<PlanRecord | PlanInput, 'name' | 'isPaid' | 'isBooked' | 'needsReservation' | 'isOptional' | 'isImportant'>,
  t: TranslateFn,
) {
  const flags = getPlanFlagsHtml(plan, t);

  return `
    <span class="flex min-w-0 flex-wrap items-center gap-2">
      <span class="min-w-0 break-words [overflow-wrap:anywhere]">${escapeHtml(plan.name)}</span>
      ${flags ? `<span class="inline-flex shrink-0 items-center gap-1">${flags}</span>` : ''}
    </span>
  `;
}
