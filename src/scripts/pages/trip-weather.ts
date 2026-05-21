import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatFriendlyDate } from '../../lib/app/format';
import type { TripRecord } from '../../lib/app/models';
import {
  fetchMergedWeatherDataset,
  getTripWeatherRangeForYear,
  getTripWeatherRequirement,
  getTripWeatherYears,
  getWeatherIconSvg,
  getWeatherLabelKeyForCode,
  type WeatherDayRecord,
  type WeatherDataset,
  type WeatherHourRecord,
} from '../../lib/app/weather';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getPageTranslator, syncTripNavigation, syncWeatherShell } from './shared';

interface WeatherDayViewModel {
  date: string;
  hourly: WeatherHourRecord[];
  mode: 'available' | 'later' | 'unavailable';
  weatherCode: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
}

interface WeatherYearViewModel {
  days: WeatherDayViewModel[];
  rangeLabel: string;
  temperatureUnit: string;
  windSpeedUnit: string;
  precipitationUnit: string;
}

const intlLocaleByAppLocale: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
};

function getTodayIsoDate() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatTemperature(value: number | null, unit: string) {
  if (value === null) {
    return '--';
  }

  return `${Math.round(value)}${unit}`;
}

function formatNumber(value: number | null, locale: Locale, digits = 0) {
  if (value === null) {
    return '--';
  }

  return new Intl.NumberFormat(intlLocaleByAppLocale[locale], {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatHourLabel(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocaleByAppLocale[locale], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function renderEmptyState(message: string) {
  return `<article class="trip-weather-empty">${escapeHtml(message)}</article>`;
}

function renderWeatherTabs(years: number[], activeYear: number) {
  const target = document.querySelector<HTMLElement>('[data-weather-year-tabs]');

  if (!target) {
    return;
  }

  target.innerHTML = years
    .map(
      (year) => `
        <button
          aria-selected="${String(year === activeYear)}"
          class="trip-weather-tab"
          data-weather-year-tab="${year}"
          role="tab"
          type="button"
        >
          ${year}
        </button>
      `,
    )
    .join('');
}

function getWeatherDaySummary(
  day: WeatherDayViewModel,
  temperatureUnit: string,
  unavailableLabel: string,
  laterLabel: string,
  t: ReturnType<typeof getPageTranslator>,
) {
  if (day.mode === 'later') {
    return `
      <div>
        <p class="trip-weather-day-summary">${escapeHtml(laterLabel)}</p>
      </div>
      <div class="trip-weather-day-main">
        <div class="trip-weather-day-temperatures">
          <strong>--</strong>
          <span>--</span>
        </div>
      </div>
    `;
  }

  if (day.mode === 'unavailable') {
    return `
      <div>
        <p class="trip-weather-day-summary">${escapeHtml(unavailableLabel)}</p>
      </div>
      <div class="trip-weather-day-main">
        <div class="trip-weather-day-temperatures">
          <strong>--</strong>
          <span>--</span>
        </div>
      </div>
    `;
  }

  const label = t(getWeatherLabelKeyForCode(day.weatherCode));

  return `
    <div>
      <p class="trip-weather-day-summary">${escapeHtml(label)}</p>
    </div>
    <div class="trip-weather-day-main">
      ${getWeatherIconSvg(day.weatherCode, true, label)}
      <div class="trip-weather-day-temperatures">
        <strong>${escapeHtml(formatTemperature(day.temperatureMax, temperatureUnit))}</strong>
        <span>${escapeHtml(formatTemperature(day.temperatureMin, temperatureUnit))}</span>
      </div>
    </div>
  `;
}

function renderWeatherDays(
  locale: Locale,
  model: WeatherYearViewModel,
  activeDate: string,
  unavailableLabel: string,
  laterLabel: string,
  t: ReturnType<typeof getPageTranslator>,
) {
  const target = document.querySelector<HTMLElement>('[data-weather-days]');
  const rangeLabel = document.querySelector<HTMLElement>('[data-weather-range-label]');

  if (!target || !rangeLabel) {
    return;
  }

  rangeLabel.textContent = model.rangeLabel;
  target.innerHTML = model.days.length
    ? model.days
        .map(
          (day) => `
            <button
              aria-pressed="${String(day.date === activeDate)}"
              class="trip-weather-day-button"
              data-weather-day-button="${day.date}"
              type="button"
            >
              <p class="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(day.date)}</p>
              <h3 class="mt-2 text-xl font-black">${escapeHtml(formatFriendlyDate(day.date, locale))}</h3>
              ${getWeatherDaySummary(day, model.temperatureUnit, unavailableLabel, laterLabel, t)}
            </button>
          `,
        )
        .join('')
    : renderEmptyState(unavailableLabel);
}

function renderWeatherHours(
  locale: Locale,
  model: WeatherYearViewModel,
  activeDate: string,
  t: ReturnType<typeof getPageTranslator>,
) {
  const target = document.querySelector<HTMLElement>('[data-weather-hours]');
  const title = document.querySelector<HTMLElement>('[data-weather-hours-title]');
  const day = model.days.find((entry) => entry.date === activeDate);

  if (!target || !title || !day) {
    return;
  }

  title.textContent = t('weather.hoursTitleWithDate').replace('{date}', formatFriendlyDate(activeDate, locale));

  if (day.mode === 'later') {
    target.innerHTML = renderEmptyState(t('weather.card.availableLater'));
    return;
  }

  if (day.mode === 'unavailable' || day.hourly.length === 0) {
    target.innerHTML = renderEmptyState(t('weather.hoursUnavailable'));
    return;
  }

  target.innerHTML = day.hourly
    .map((hour) => {
      const label = t(getWeatherLabelKeyForCode(hour.weatherCode));

      return `
        <article class="trip-weather-hour-card">
          <div class="trip-weather-hour-grid">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(
                formatHourLabel(hour.time, locale),
              )}</p>
              <p class="trip-weather-hour-summary mt-1">${escapeHtml(label)}</p>
            </div>
            <div class="flex items-center justify-center">
              ${getWeatherIconSvg(hour.weatherCode, hour.isDay, label)}
            </div>
            <div class="trip-weather-hour-temperatures">
              <strong>${escapeHtml(formatTemperature(hour.temperature, model.temperatureUnit))}</strong>
              <span>${escapeHtml(formatTemperature(hour.apparentTemperature, model.temperatureUnit))}</span>
            </div>
          </div>
          <div class="trip-weather-hour-meta">
            <span>${escapeHtml(t('weather.meta.precipitation'))}: ${escapeHtml(
              `${formatNumber(hour.precipitation, locale, 1)} ${model.precipitationUnit}`,
            )}</span>
            <span>${escapeHtml(t('weather.meta.wind'))}: ${escapeHtml(
              `${formatNumber(hour.windSpeed, locale)} ${model.windSpeedUnit}`,
            )}</span>
            <span>${escapeHtml(t('weather.meta.cloudCover'))}: ${escapeHtml(
              `${formatNumber(hour.cloudCover, locale)}%`,
            )}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function buildWeatherYearViewModel(
  dates: string[],
  dataset: WeatherDataset,
  t: ReturnType<typeof getPageTranslator>,
) {
  const today = getTodayIsoDate();
  const dailyMap = new Map(dataset.daily.map((entry) => [entry.date, entry] satisfies [string, WeatherDayRecord]));

  const days = dates.map((date) => {
    const day = dailyMap.get(date);

    if (!day) {
      return {
        date,
        hourly: [],
        mode: date > today ? 'later' : 'unavailable',
        weatherCode: 0,
        temperatureMax: null,
        temperatureMin: null,
      } satisfies WeatherDayViewModel;
    }

    return {
      date,
      hourly: dataset.hourlyByDate[date] ?? [],
      mode: 'available',
      weatherCode: day.weatherCode,
      temperatureMax: day.temperatureMax,
      temperatureMin: day.temperatureMin,
    } satisfies WeatherDayViewModel;
  });

  return {
    days,
    rangeLabel: t('weather.rangeLabel').replace('{count}', String(days.length)),
    temperatureUnit: dataset.temperatureUnit,
    windSpeedUnit: dataset.windSpeedUnit,
    precipitationUnit: dataset.precipitationUnit,
  } satisfies WeatherYearViewModel;
}

export function mountTripWeatherPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const subscriptions = createSubscriptionScope();
  const yearCache = new Map<number, WeatherYearViewModel>();
  const selectedDayByYear = new Map<number, string>();
  let currentTrip: TripRecord | null = null;
  let activeYear = 0;
  let requestToken = 0;

  if (!tripId) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);

  const renderFromCache = (year: number) => {
    const model = yearCache.get(year);

    if (!model) {
      return false;
    }

    const activeDate = selectedDayByYear.get(year) ?? model.days[0]?.date ?? '';
    selectedDayByYear.set(year, activeDate);
    renderWeatherDays(
      locale,
      model,
      activeDate,
      t('weather.hoursUnavailable'),
      t('weather.card.availableLater'),
      t,
    );
    renderWeatherHours(locale, model, activeDate, t);
    return true;
  };

  const loadYear = async (year: number) => {
    if (!currentTrip) {
      return;
    }

    if (renderFromCache(year)) {
      return;
    }

    const requirement = getTripWeatherRequirement(currentTrip);
    const range = getTripWeatherRangeForYear(currentTrip, year);

    if (!requirement.ready || !range || typeof currentTrip.locationLat !== 'number' || typeof currentTrip.locationLng !== 'number') {
      const targetDays = document.querySelector<HTMLElement>('[data-weather-days]');
      const targetHours = document.querySelector<HTMLElement>('[data-weather-hours]');

      if (targetDays) {
        targetDays.innerHTML = renderEmptyState(t('weather.card.missingConfig'));
      }

      if (targetHours) {
        targetHours.innerHTML = renderEmptyState(t('weather.card.missingConfig'));
      }

      return;
    }

    const token = requestToken + 1;
    requestToken = token;
    const targetDays = document.querySelector<HTMLElement>('[data-weather-days]');
    const targetHours = document.querySelector<HTMLElement>('[data-weather-hours]');

    if (targetDays) {
      targetDays.innerHTML = renderEmptyState(t('common.loading'));
    }

    if (targetHours) {
      targetHours.innerHTML = renderEmptyState(t('common.loading'));
    }

    try {
      const dataset = await fetchMergedWeatherDataset(
        currentTrip.locationLat,
        currentTrip.locationLng,
        range.startDate,
        range.endDate,
      );

      if (token !== requestToken) {
        return;
      }

      const model = buildWeatherYearViewModel(range.dates, dataset, t);
      yearCache.set(year, model);
      selectedDayByYear.set(year, model.days.find((day) => day.mode === 'available')?.date ?? model.days[0]?.date ?? '');
      renderFromCache(year);
    } catch {
      if (token !== requestToken) {
        return;
      }

      if (targetDays) {
        targetDays.innerHTML = renderEmptyState(t('weather.card.error'));
      }

      if (targetHours) {
        targetHours.innerHTML = renderEmptyState(t('weather.card.error'));
      }
    }
  };

  window.addEventListener(
    'pagehide',
    () => {
      subscriptions.clear();
    },
    { once: true },
  );

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const yearButton = target.closest<HTMLElement>('[data-weather-year-tab]');

    if (yearButton) {
      const year = Number(yearButton.dataset.weatherYearTab ?? '');

      if (Number.isFinite(year) && year !== activeYear) {
        activeYear = year;
        renderWeatherTabs(getTripWeatherYears(currentTrip ?? { startDate: '' }), activeYear);
        void loadYear(activeYear);
      }

      return;
    }

    const dayButton = target.closest<HTMLElement>('[data-weather-day-button]');

    if (!dayButton) {
      return;
    }

    const date = dayButton.dataset.weatherDayButton ?? '';
    const model = yearCache.get(activeYear);

    if (!date || !model) {
      return;
    }

    selectedDayByYear.set(activeYear, date);
    renderWeatherDays(
      locale,
      model,
      date,
      t('weather.hoursUnavailable'),
      t('weather.card.availableLater'),
      t,
    );
    renderWeatherHours(locale, model, date, t);
  });

  observeSession((user) => {
    subscriptions.clear();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        yearCache.clear();
        selectedDayByYear.clear();
        currentTrip = trip;

        if (!trip) {
          const targetDays = document.querySelector<HTMLElement>('[data-weather-days]');
          const targetHours = document.querySelector<HTMLElement>('[data-weather-hours]');

          if (targetDays) {
            targetDays.innerHTML = renderEmptyState(t('trip.notFound'));
          }

          if (targetHours) {
            targetHours.innerHTML = renderEmptyState(t('trip.notFound'));
          }

          return;
        }

        syncWeatherShell(locale, trip);

        const years = getTripWeatherYears(trip);
        activeYear = years[0] ?? 0;
        renderWeatherTabs(years, activeYear);
        void loadYear(activeYear);
      }),
    );
  });
}
