import type { PlanRecord, TripRecord } from '../app/models';

const cachePrefix = 'travel-plan:shared-cache:v2';
const persistentCacheMaxAgeMs = 30 * 1000;
const memoryCache = new Map<string, unknown>();

type CachedValue<T> = {
  savedAt: number;
  value: T;
};

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getKey(key: string) {
  return `${cachePrefix}:${key}`;
}

function canUseStoredValue(savedAt: number) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  return Date.now() - savedAt <= persistentCacheMaxAgeMs;
}

function readCachedValue<T>(key: string): T | null {
  const memoryValue = memoryCache.get(key);

  if (memoryValue !== undefined) {
    return memoryValue as T;
  }

  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(getKey(key));

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedValue<T>;

    if (!canUseStoredValue(cached.savedAt)) {
      storage.removeItem(getKey(key));
      return null;
    }

    memoryCache.set(key, cached.value);

    return cached.value;
  } catch {
    storage.removeItem(getKey(key));
    return null;
  }
}

function writeCachedValue<T>(key: string, value: T) {
  memoryCache.set(key, value);
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      getKey(key),
      JSON.stringify({
        savedAt: Date.now(),
        value,
      } satisfies CachedValue<T>),
    );
  } catch {
    // Storage quota or privacy restrictions should not break Firebase flows.
  }
}

function removeCachedValue(key: string) {
  memoryCache.delete(key);
  getStorage()?.removeItem(getKey(key));
}

function getTripKey(tripId: string) {
  return `trip:${tripId}`;
}

function getTripPlansKey(tripId: string) {
  return `trip:${tripId}:plans`;
}

export function getCachedTrip(tripId: string) {
  return readCachedValue<TripRecord>(getTripKey(tripId));
}

export function setCachedTrip(trip: TripRecord) {
  writeCachedValue(getTripKey(trip.id), trip);
}

export function clearCachedTrip(tripId: string) {
  removeCachedValue(getTripKey(tripId));
}

export function getCachedTripPlans(tripId: string) {
  return readCachedValue<PlanRecord[]>(getTripPlansKey(tripId));
}

export function setCachedTripPlans(tripId: string, plans: PlanRecord[]) {
  writeCachedValue(getTripPlansKey(tripId), plans);
}

export function clearCachedTripPlans(tripId: string) {
  removeCachedValue(getTripPlansKey(tripId));
}

export function clearTripSharedCache(tripId: string) {
  clearCachedTrip(tripId);
  clearCachedTripPlans(tripId);
}

export function clearSharedDataCache() {
  memoryCache.clear();
  const storage = getStorage();

  if (!storage) {
    return;
  }

  Object.keys(storage)
    .filter((key) => key.startsWith(cachePrefix))
    .forEach((key) => storage.removeItem(key));
}