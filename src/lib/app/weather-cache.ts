const weatherCachePrefix = 'travel-plan:weather-cache:v1';
const weatherMemoryCache = new Map<string, unknown>();

interface CachedWeatherValue<T> {
  expiresAt: number;
  value: T;
}

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

function getCacheKey(key: string) {
  return `${weatherCachePrefix}:${key}`;
}

export function readWeatherCache<T>(key: string) {
  const memoryValue = weatherMemoryCache.get(key) as CachedWeatherValue<T> | undefined;

  if (memoryValue) {
    if (memoryValue.expiresAt > Date.now()) {
      return memoryValue.value;
    }

    weatherMemoryCache.delete(key);
  }

  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(getCacheKey(key));

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedWeatherValue<T>;

    if (cached.expiresAt <= Date.now()) {
      storage.removeItem(getCacheKey(key));
      return null;
    }

    weatherMemoryCache.set(key, cached);
    return cached.value;
  } catch {
    storage.removeItem(getCacheKey(key));
    return null;
  }
}

export function writeWeatherCache<T>(key: string, value: T, ttlMs: number) {
  const cached: CachedWeatherValue<T> = {
    expiresAt: Date.now() + ttlMs,
    value,
  };

  weatherMemoryCache.set(key, cached);

  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(getCacheKey(key), JSON.stringify(cached));
  } catch {
    // Ignore quota and privacy errors to avoid breaking the UI.
  }
}
