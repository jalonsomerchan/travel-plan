import {
  nearbyPoiCategories,
  nearbyPoiDefaultRadius,
  nearbyPoiMaxRadius,
  nearbyPoiRequestTimeoutMs,
  nearbyPoiResultLimit,
  type NearbyPoiCategoryConfig,
  type NearbyPoiTagFilter,
} from '../../config/poi';
import { formatCoordinatesLabel, getDistanceBetweenCoordinates } from './coordinates';

export type NearbyPoiCategoryId = (typeof nearbyPoiCategories)[number]['id'];

export interface NearbyPoiSearchParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  categoryIds: NearbyPoiCategoryId[];
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
}

interface NearbyPoiCacheEntry {
  expiresAt: number;
  response: NearbyPoiSearchResponse;
}

export interface NearbyPoiResult {
  id: string;
  osmType: OverpassElement['type'];
  osmId: number;
  name?: string;
  categoryId: NearbyPoiCategoryId;
  latitude: number;
  longitude: number;
  distanceKm: number;
  coordinatesLabel: string;
  tags: Record<string, string>;
}

export interface NearbyPoiSearchResponse {
  results: NearbyPoiResult[];
  truncated: boolean;
}

export class NearbyPoiError extends Error {
  code: 'bad_request' | 'rate_limited' | 'timeout' | 'network' | 'service';

  constructor(code: NearbyPoiError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const overpassEndpoint = 'https://overpass-api.de/api/interpreter';
const queryCache = new Map<string, NearbyPoiCacheEntry>();
const cacheTtlMs = 5 * 60 * 1000;

export function getNearbyPoiCategories() {
  return nearbyPoiCategories;
}

export function getNearbyPoiDefaultCategoryIds(): NearbyPoiCategoryId[] {
  return ['food', 'culture', 'parks'];
}

export function getNearbyPoiDefaultRadius() {
  return nearbyPoiDefaultRadius;
}

export function getNearbyPoiMaxRadius() {
  return nearbyPoiMaxRadius;
}

export function getNearbyPoiResultLimit() {
  return nearbyPoiResultLimit;
}

function toCacheKey({ latitude, longitude, radiusMeters, categoryIds }: Required<NearbyPoiSearchParams>) {
  return [
    latitude.toFixed(5),
    longitude.toFixed(5),
    radiusMeters,
    [...categoryIds].sort().join(','),
  ].join(':');
}

function getCoordinates(element: OverpassElement) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (typeof element.center?.lat === 'number' && typeof element.center?.lon === 'number') {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }

  return null;
}

function matchesFilter(tags: Record<string, string>, filter: NearbyPoiTagFilter) {
  const value = tags[filter.key];

  if (!value) {
    return false;
  }

  return filter.useRegex ? new RegExp(filter.value, 'i').test(value) : value === filter.value;
}

function getCategoryForTags(tags: Record<string, string>, selectedCategories: NearbyPoiCategoryConfig[]) {
  return selectedCategories.find((category) =>
    category.overpassFilters.some((filter) => matchesFilter(tags, filter)),
  );
}

function buildFilterClause(filter: NearbyPoiTagFilter) {
  if (filter.useRegex) {
    return `["${filter.key}"~"${filter.value}"]`;
  }

  return `["${filter.key}"="${filter.value}"]`;
}

export function buildNearbyPoiOverpassQuery({
  latitude,
  longitude,
  radiusMeters = nearbyPoiDefaultRadius,
  categoryIds,
}: NearbyPoiSearchParams) {
  const selectedCategories = nearbyPoiCategories.filter((category) => categoryIds.includes(category.id));
  const radius = Math.min(Math.max(Math.round(radiusMeters), 1), nearbyPoiMaxRadius);
  const fragments = selectedCategories
    .flatMap((category) =>
      category.overpassFilters.flatMap((filter) =>
        ['node', 'way', 'relation'].map(
          (type) =>
            `  ${type}(around:${radius},${latitude.toFixed(5)},${longitude.toFixed(5)})${buildFilterClause(filter)};`,
        ),
      ),
    )
    .join('\n');

  return `[out:json][timeout:25];
(
${fragments}
);
out center tags ${nearbyPoiResultLimit};`;
}

function createAbortController(signal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), nearbyPoiRequestTimeoutMs);
  const abortFromParent = () => controller.abort();

  signal?.addEventListener('abort', abortFromParent, { once: true });

  return {
    controller,
    cleanup() {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromParent);
    },
  };
}

export async function searchNearbyPois(
  params: NearbyPoiSearchParams,
  options: { signal?: AbortSignal } = {},
): Promise<NearbyPoiSearchResponse> {
  const normalizedParams = {
    ...params,
    radiusMeters: Math.min(Math.max(Math.round(params.radiusMeters ?? nearbyPoiDefaultRadius), 1), nearbyPoiMaxRadius),
    categoryIds: params.categoryIds,
  };

  if (normalizedParams.categoryIds.length === 0) {
    return { results: [], truncated: false };
  }

  const cacheKey = toCacheKey(normalizedParams);
  const cached = queryCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }

  const { controller, cleanup } = createAbortController(options.signal);

  try {
    const response = await fetch(overpassEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: `data=${encodeURIComponent(buildNearbyPoiOverpassQuery(normalizedParams))}`,
      signal: controller.signal,
    });

    if (response.status === 400) {
      throw new NearbyPoiError('bad_request', 'Invalid Overpass query');
    }

    if (response.status === 429) {
      throw new NearbyPoiError('rate_limited', 'Too many requests');
    }

    if (!response.ok) {
      throw new NearbyPoiError('service', 'Nearby places request failed');
    }

    const data = (await response.json()) as { elements?: OverpassElement[] };
    const selectedCategories = nearbyPoiCategories.filter((category) =>
      normalizedParams.categoryIds.includes(category.id),
    );
    const normalizedResults = new Map<string, NearbyPoiResult>();

    (data.elements ?? []).forEach((element) => {
      const coordinates = getCoordinates(element);
      const tags = element.tags ?? {};
      const category = getCategoryForTags(tags, selectedCategories);

      if (!coordinates || !category) {
        return;
      }

      const distanceKm = getDistanceBetweenCoordinates(
        { latitude: normalizedParams.latitude, longitude: normalizedParams.longitude },
        coordinates,
      );

      normalizedResults.set(`${element.type}-${element.id}`, {
        id: `${element.type}-${element.id}`,
        osmType: element.type,
        osmId: element.id,
        name: tags.name,
        categoryId: category.id,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        distanceKm,
        coordinatesLabel: formatCoordinatesLabel(coordinates.latitude, coordinates.longitude),
        tags,
      });
    });

    const result = {
      results: [...normalizedResults.values()]
        .sort((left, right) => left.distanceKm - right.distanceKm)
        .slice(0, nearbyPoiResultLimit),
      truncated: normalizedResults.size >= nearbyPoiResultLimit,
    };

    queryCache.set(cacheKey, {
      expiresAt: Date.now() + cacheTtlMs,
      response: result,
    });

    return result;
  } catch (error) {
    if (error instanceof NearbyPoiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NearbyPoiError('timeout', 'Nearby places request timed out');
    }

    throw new NearbyPoiError('network', 'Nearby places request could not be completed');
  } finally {
    cleanup();
  }
}
