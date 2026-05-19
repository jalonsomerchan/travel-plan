import type { Locale } from '../../config/site';
import type { PlanRecord } from './models';

const intlLocales: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
};

export function toIntlLocale(locale: Locale) {
  return intlLocales[locale];
}

export function formatFriendlyDate(value: string | undefined, locale: Locale) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateRange(startDate: string, endDate: string, locale: Locale) {
  return `${formatFriendlyDate(startDate, locale)} - ${formatFriendlyDate(endDate, locale)}`;
}

export function formatPlanMoment(plan: PlanRecord, locale: Locale) {
  const dateLabel = formatFriendlyDate(plan.date, locale);

  if (dateLabel && plan.time) {
    return `${dateLabel} · ${plan.time}`;
  }

  return dateLabel || plan.time || '';
}

export function getMonthCursor(value: string | null) {
  const baseDate = value ? new Date(`${value}-01T00:00:00`) : new Date();

  return {
    year: baseDate.getFullYear(),
    month: baseDate.getMonth(),
  };
}

export function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getMonthLabel(locale: Locale, year: number, month: number) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

export function getCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: Array<{ day: number; key: string }> = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push({
      day,
      key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  return { firstWeekday, grid };
}
