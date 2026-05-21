import type { TripRecord } from './models';
import { readWeatherCache, writeWeatherCache } from './weather-cache';

const forecastEndpoint = 'https://api.open-meteo.com/v1/forecast';
const archiveEndpoint = 'https://archive-api.open-meteo.com/v1/archive';
const forecastHorizonDays = 16;
const weatherHistoryYears = 11;
const forecastCacheTtlMs = 30 * 60 * 1000;
const archiveCacheTtlMs = 180 * 24 * 60 * 60 * 1000;

export interface TripWeatherRequirement {
  ready: boolean;
  missingDates: boolean;
  missingLocation: boolean;
}

export interface WeatherDayRecord {
  date: string;
  weatherCode: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
}

export interface WeatherHourRecord {
  time: string;
  weatherCode: number;
  temperature: number | null;
  apparentTemperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  cloudCover: number | null;
  isDay: boolean;
}

export interface WeatherDataset {
  daily: WeatherDayRecord[];
  hourlyByDate: Record<string, WeatherHourRecord[]>;
  temperatureUnit: string;
  windSpeedUnit: string;
  precipitationUnit: string;
}

export interface TripWeatherYearRange {
  year: number;
  startDate: string;
  endDate: string;
  dates: string[];
}

type WeatherSource = 'forecast' | 'archive';

function isValidDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toDateParts(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toLocalDate(value: string) {
  const { year, month, day } = toDateParts(value);
  return new Date(year, month - 1, day);
}

function addDays(value: string, days: number) {
  const date = toLocalDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function getInclusiveDayCount(startDate: string, endDate: string) {
  const start = toLocalDate(startDate).getTime();
  const end = toLocalDate(endDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / dayMs) + 1);
}

function getTodayIsoDate() {
  return toIsoDate(new Date());
}

function getForecastLimitDate(today = getTodayIsoDate()) {
  return addDays(today, forecastHorizonDays - 1);
}

function getWeatherLabelKey(weatherCode: number) {
  if (weatherCode === 0) {
    return 'weather.code.clear';
  }

  if ([1, 2, 3].includes(weatherCode)) {
    return 'weather.code.cloudy';
  }

  if ([45, 48].includes(weatherCode)) {
    return 'weather.code.fog';
  }

  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return 'weather.code.drizzle';
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return 'weather.code.rain';
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return 'weather.code.snow';
  }

  return 'weather.code.storm';
}

function getOpenWeatherIconId(weatherCode: number, isDay: boolean) {
  const suffix = isDay ? 'd' : 'n';

  if (weatherCode === 0) {
    return `01${suffix}`;
  }

  if ([1, 2].includes(weatherCode)) {
    return `02${suffix}`;
  }

  if (weatherCode === 3) {
    return `04${suffix}`;
  }

  if ([45, 48].includes(weatherCode)) {
    return `50${suffix}`;
  }

  if ([51, 53, 55, 56, 57, 80, 81, 82].includes(weatherCode)) {
    return `09${suffix}`;
  }

  if ([61, 63, 65, 66, 67].includes(weatherCode)) {
    return `10${suffix}`;
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return `13${suffix}`;
  }

  return `11${suffix}`;
}

export function getWeatherIconSvg(weatherCode: number, isDay: boolean, label: string) {
  const iconId = getOpenWeatherIconId(weatherCode, isDay);
  const iconUrl = `https://openweathermap.org/img/wn/${iconId}@4x.png`;

  return `<img alt="${label}" class="weather-icon-svg" height="96" loading="lazy" src="${iconUrl}" width="96" />`;
}

function buildWeatherUrl(source: WeatherSource, latitude: number, longitude: number, startDate: string, endDate: string) {
  const url = new URL(source === 'forecast' ? forecastEndpoint : archiveEndpoint);

  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set(
    'daily',
    ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'].join(','),
  );
  url.searchParams.set(
    'hourly',
    [
      'weather_code',
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'wind_speed_10m',
      'cloud_cover',
      'is_day',
    ].join(','),
  );
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('precipitation_unit', 'mm');

  return url.toString();
}

async function fetchCachedJson<T>(url: string, ttlMs: number) {
  const cached = readWeatherCache<T>(url);

  if (cached) {
    return cached;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`weather-request-failed:${response.status}`);
  }

  const payload = (await response.json()) as T;
  writeWeatherCache(url, payload, ttlMs);

  return payload;
}

function toNumberArray(values: unknown) {
  return Array.isArray(values) ? values.map((value) => (typeof value === 'number' ? value : null)) : [];
}

function toStringArray(values: unknown) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '')) : [];
}

function normalizeWeatherPayload(payload: Record<string, unknown>) {
  const daily = (payload.daily ?? {}) as Record<string, unknown>;
  const hourly = (payload.hourly ?? {}) as Record<string, unknown>;
  const dailyTime = toStringArray(daily.time);
  const hourlyTime = toStringArray(hourly.time);
  const hourlyByDate: Record<string, WeatherHourRecord[]> = {};

  hourlyTime.forEach((time, index) => {
    const dateKey = time.slice(0, 10);
    hourlyByDate[dateKey] ??= [];
    hourlyByDate[dateKey].push({
      time,
      weatherCode: toNumberArray(hourly.weather_code)[index] ?? 0,
      temperature: toNumberArray(hourly.temperature_2m)[index] ?? null,
      apparentTemperature: toNumberArray(hourly.apparent_temperature)[index] ?? null,
      precipitation: toNumberArray(hourly.precipitation)[index] ?? null,
      windSpeed: toNumberArray(hourly.wind_speed_10m)[index] ?? null,
      cloudCover: toNumberArray(hourly.cloud_cover)[index] ?? null,
      isDay: Boolean(toNumberArray(hourly.is_day)[index] ?? 1),
    });
  });

  return {
    daily: dailyTime.map((date, index) => ({
      date,
      weatherCode: toNumberArray(daily.weather_code)[index] ?? 0,
      temperatureMax: toNumberArray(daily.temperature_2m_max)[index] ?? null,
      temperatureMin: toNumberArray(daily.temperature_2m_min)[index] ?? null,
      precipitationSum: toNumberArray(daily.precipitation_sum)[index] ?? null,
    })),
    hourlyByDate,
    temperatureUnit: String((payload.daily_units as Record<string, unknown> | undefined)?.temperature_2m_max ?? '°C'),
    windSpeedUnit: String((payload.hourly_units as Record<string, unknown> | undefined)?.wind_speed_10m ?? 'km/h'),
    precipitationUnit: String((payload.daily_units as Record<string, unknown> | undefined)?.precipitation_sum ?? 'mm'),
  } satisfies WeatherDataset;
}

export function getTripWeatherRequirement(trip: Pick<TripRecord, 'startDate' | 'endDate' | 'locationLat' | 'locationLng'>) {
  const missingDates = !isValidDate(trip.startDate) || !isValidDate(trip.endDate);
  const missingLocation = typeof trip.locationLat !== 'number' || typeof trip.locationLng !== 'number';

  return {
    ready: !missingDates && !missingLocation,
    missingDates,
    missingLocation,
  } satisfies TripWeatherRequirement;
}

export function getTripWeatherRangeForYear(
  trip: Pick<TripRecord, 'startDate' | 'endDate'>,
  year: number,
): TripWeatherYearRange | null {
  if (!isValidDate(trip.startDate) || !isValidDate(trip.endDate)) {
    return null;
  }

  const durationDays = getInclusiveDayCount(trip.startDate, trip.endDate);
  const { month, day } = toDateParts(trip.startDate);
  const startDate = toIsoDate(new Date(year, month - 1, day));
  const dates = Array.from({ length: durationDays }, (_, index) => addDays(startDate, index));

  return {
    year,
    startDate,
    endDate: dates[dates.length - 1],
    dates,
  };
}

export function getTripWeatherYears(trip: Pick<TripRecord, 'startDate'>) {
  if (!isValidDate(trip.startDate)) {
    return [];
  }

  const tripYear = toDateParts(trip.startDate).year;
  return Array.from({ length: weatherHistoryYears }, (_, index) => tripYear - index);
}

export function getTripWeatherCardDates(trip: Pick<TripRecord, 'startDate' | 'endDate'>, today = getTodayIsoDate()) {
  if (!isValidDate(trip.startDate) || !isValidDate(trip.endDate)) {
    return { mode: 'missing' as const, dates: [] as string[] };
  }

  if (today < trip.startDate) {
    return { mode: 'upcoming' as const, dates: [trip.startDate] };
  }

  if (today > trip.endDate) {
    return { mode: 'past' as const, dates: [] as string[] };
  }

  return {
    mode: 'ongoing' as const,
    dates: [today, addDays(today, 1)].filter((date, index, all) => date <= trip.endDate && all.indexOf(date) === index),
  };
}

export function isForecastAvailable(date: string, today = getTodayIsoDate()) {
  return date >= today && date <= getForecastLimitDate(today);
}

export function getWeatherLabelKeyForCode(weatherCode: number) {
  return getWeatherLabelKey(weatherCode);
}

export async function fetchWeatherDataset(
  source: WeatherSource,
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
) {
  const url = buildWeatherUrl(source, latitude, longitude, startDate, endDate);
  const payload = await fetchCachedJson<Record<string, unknown>>(
    url,
    source === 'forecast' ? forecastCacheTtlMs : archiveCacheTtlMs,
  );

  return normalizeWeatherPayload(payload);
}

export async function fetchMergedWeatherDataset(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  today = getTodayIsoDate(),
) {
  const segments: WeatherDataset[] = [];

  if (endDate < today) {
    segments.push(await fetchWeatherDataset('archive', latitude, longitude, startDate, endDate));
  } else if (startDate > getForecastLimitDate(today)) {
    return {
      daily: [],
      hourlyByDate: {},
      temperatureUnit: '°C',
      windSpeedUnit: 'km/h',
      precipitationUnit: 'mm',
    } satisfies WeatherDataset;
  } else if (startDate >= today) {
    const forecastEndDate = endDate <= getForecastLimitDate(today) ? endDate : getForecastLimitDate(today);
    segments.push(await fetchWeatherDataset('forecast', latitude, longitude, startDate, forecastEndDate));
  } else {
    const archiveEndDate = addDays(today, -1);

    if (startDate <= archiveEndDate) {
      segments.push(await fetchWeatherDataset('archive', latitude, longitude, startDate, archiveEndDate));
    }

    const forecastEndDate = endDate <= getForecastLimitDate(today) ? endDate : getForecastLimitDate(today);
    segments.push(await fetchWeatherDataset('forecast', latitude, longitude, today, forecastEndDate));
  }

  return segments.reduce<WeatherDataset>(
    (accumulator, dataset) => {
      accumulator.daily.push(...dataset.daily);
      Object.entries(dataset.hourlyByDate).forEach(([date, hours]) => {
        accumulator.hourlyByDate[date] = hours;
      });
      accumulator.temperatureUnit = dataset.temperatureUnit || accumulator.temperatureUnit;
      accumulator.windSpeedUnit = dataset.windSpeedUnit || accumulator.windSpeedUnit;
      accumulator.precipitationUnit = dataset.precipitationUnit || accumulator.precipitationUnit;
      return accumulator;
    },
    {
      daily: [],
      hourlyByDate: {},
      temperatureUnit: '°C',
      windSpeedUnit: 'km/h',
      precipitationUnit: 'mm',
    },
  );
}
