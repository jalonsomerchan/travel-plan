import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface PickerContext {
  root: HTMLElement;
  map: L.Map;
  marker: L.CircleMarker;
  queryInput: HTMLInputElement;
  results: HTMLElement;
  summary: HTMLElement;
  nameInput: HTMLInputElement;
  latInput: HTMLInputElement;
  lngInput: HTMLInputElement;
  clearButton: HTMLButtonElement;
  searchButton: HTMLButtonElement;
  currentButton: HTMLButtonElement | null;
  searchResults: SearchResult[];
  activeResultIndex: number;
  searchRequestId: number;
  searchAbortController: AbortController | null;
  searchDebounceId: number | null;
}

const pickerContexts = new WeakMap<HTMLElement, PickerContext>();

function setSummary(context: PickerContext, html: string) {
  context.summary.innerHTML = html;
}

function setInitialMessages(context: PickerContext) {
  context.root.dataset.initialResults = context.results.textContent?.trim() ?? '';
  context.root.dataset.initialSummary = context.summary.textContent?.trim() ?? '';
}

function setResultsExpanded(context: PickerContext, expanded: boolean) {
  context.queryInput.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  context.results.hidden = !expanded;
}

function clearDebounce(context: PickerContext) {
  if (context.searchDebounceId !== null) {
    window.clearTimeout(context.searchDebounceId);
    context.searchDebounceId = null;
  }
}

function abortInFlightSearch(context: PickerContext) {
  context.searchAbortController?.abort();
  context.searchAbortController = null;
}

function resetResultsState(context: PickerContext, message?: string) {
  context.searchResults = [];
  context.activeResultIndex = -1;
  context.queryInput.removeAttribute('aria-activedescendant');
  context.results.innerHTML = message ?? context.root.dataset.initialResults ?? '';
  setResultsExpanded(context, false);
}

function applySelection(
  context: PickerContext,
  selection: { name: string; lat: number; lng: number } | null,
) {
  if (!selection) {
    context.nameInput.value = '';
    context.latInput.value = '';
    context.lngInput.value = '';
    context.marker.setStyle({ opacity: 0, fillOpacity: 0 });
    setSummary(context, context.root.dataset.initialSummary ?? '');
    return;
  }

  context.nameInput.value = selection.name;
  context.latInput.value = String(selection.lat);
  context.lngInput.value = String(selection.lng);
  context.queryInput.value = selection.name;
  context.marker.setLatLng([selection.lat, selection.lng]);
  context.marker.setStyle({ opacity: 1, fillOpacity: 0.85 });
  context.map.setView([selection.lat, selection.lng], 14);
  setSummary(
    context,
    `<strong>${context.root.dataset.selectedLabel ?? 'Selected'}:</strong> ${selection.name}`,
  );
}

function clearSelectionData(context: PickerContext) {
  context.nameInput.value = '';
  context.latInput.value = '';
  context.lngInput.value = '';
  context.marker.setStyle({ opacity: 0, fillOpacity: 0 });
  setSummary(context, context.root.dataset.initialSummary ?? '');
}

async function runSearch(query: string, signal?: AbortSignal) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  return (await response.json()) as SearchResult[];
}

function getResultId(context: PickerContext, index: number) {
  return `${context.root.dataset.resultsId ?? 'location-results'}-${index}`;
}

function updateActiveResult(context: PickerContext, nextIndex: number) {
  if (context.searchResults.length === 0) {
    context.activeResultIndex = -1;
    context.queryInput.removeAttribute('aria-activedescendant');
    return;
  }

  const boundedIndex = Math.max(0, Math.min(context.searchResults.length - 1, nextIndex));
  context.activeResultIndex = boundedIndex;

  context.results.querySelectorAll<HTMLButtonElement>('[data-location-result-index]').forEach((button) => {
    const isActive = Number(button.dataset.locationResultIndex) === boundedIndex;
    button.dataset.active = isActive ? 'true' : 'false';
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');

    if (isActive) {
      button.scrollIntoView({ block: 'nearest' });
      context.queryInput.setAttribute('aria-activedescendant', button.id);
    }
  });
}

function applySearchResult(context: PickerContext, result: SearchResult) {
  applySelection(context, {
    name: result.display_name,
    lat: Number(result.lat),
    lng: Number(result.lon),
  });
  resetResultsState(context, context.root.dataset.initialResults ?? '');
}

function renderSearchResults(context: PickerContext, results: SearchResult[]) {
  context.searchResults = results;
  context.activeResultIndex = results.length > 0 ? 0 : -1;

  if (results.length === 0) {
    context.queryInput.removeAttribute('aria-activedescendant');
    context.results.textContent = context.root.dataset.noResultsLabel ?? 'No results';
    setResultsExpanded(context, true);
    return;
  }

  context.results.innerHTML = results
    .map(
      (result, index) => `
        <button
          aria-selected="${index === 0 ? 'true' : 'false'}"
          class="location-result-button"
          data-active="${index === 0 ? 'true' : 'false'}"
          data-location-result-index="${index}"
          id="${getResultId(context, index)}"
          role="option"
          type="button"
        >
          <span class="location-result-title">${result.display_name}</span>
          <span class="location-result-meta">${Number(result.lat).toFixed(5)}, ${Number(result.lon).toFixed(5)}</span>
        </button>
      `,
    )
    .join('');

  context.results.querySelectorAll<HTMLButtonElement>('[data-location-result-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const result = results[Number(button.dataset.locationResultIndex ?? 0)];

      if (result) {
        applySearchResult(context, result);
      }
    });
  });

  updateActiveResult(context, 0);
  setResultsExpanded(context, true);
}

function createPickerContext(root: HTMLElement) {
  const mapElement = root.querySelector<HTMLElement>('[data-location-map]');
  const queryInput = root.querySelector<HTMLInputElement>('[data-location-query]');
  const results = root.querySelector<HTMLElement>('[data-location-search-results]');
  const summary = root.querySelector<HTMLElement>('[data-location-selected-summary]');
  const nameInput = root.querySelector<HTMLInputElement>('[data-location-name]');
  const latInput = root.querySelector<HTMLInputElement>('[data-location-lat]');
  const lngInput = root.querySelector<HTMLInputElement>('[data-location-lng]');
  const clearButton = root.querySelector<HTMLButtonElement>('[data-location-clear-button]');
  const searchButton = root.querySelector<HTMLButtonElement>('[data-location-search-button]');
  const currentButton = root.querySelector<HTMLButtonElement>('[data-location-current-button]');

  if (
    !mapElement ||
    !queryInput ||
    !results ||
    !summary ||
    !nameInput ||
    !latInput ||
    !lngInput ||
    !clearButton ||
    !searchButton
  ) {
    return null;
  }

  const map = L.map(mapElement, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([40.4168, -3.7038], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const marker = L.circleMarker([0, 0], {
    radius: 9,
    color: '#2563eb',
    fillColor: '#34d399',
    fillOpacity: 0,
    opacity: 0,
    weight: 3,
  }).addTo(map);

  const context: PickerContext = {
    root,
    map,
    marker,
    queryInput,
    results,
    summary,
    nameInput,
    latInput,
    lngInput,
    clearButton,
    searchButton,
    currentButton,
    searchResults: [],
    activeResultIndex: -1,
    searchRequestId: 0,
    searchAbortController: null,
    searchDebounceId: null,
  };

  setInitialMessages(context);
  setResultsExpanded(context, false);

  map.on('click', (event) => {
    applySelection(context, {
      name: root.dataset.unnamedLabel ?? 'Pinned location',
      lat: event.latlng.lat,
      lng: event.latlng.lng,
    });
  });

  const existingLat = Number(latInput.value);
  const existingLng = Number(lngInput.value);
  if (!Number.isNaN(existingLat) && !Number.isNaN(existingLng) && nameInput.value) {
    applySelection(context, {
      name: nameInput.value,
      lat: existingLat,
      lng: existingLng,
    });
  }

  setTimeout(() => map.invalidateSize(), 0);

  return context;
}

async function executeSearch(context: PickerContext) {
  const query = context.queryInput.value.trim();

  clearDebounce(context);
  abortInFlightSearch(context);

  if (query.length < 2) {
    resetResultsState(context, query ? context.root.dataset.emptyQueryLabel ?? 'Write a location to search' : context.root.dataset.initialResults ?? '');
    return;
  }

  context.searchRequestId += 1;
  const requestId = context.searchRequestId;
  const abortController = new AbortController();
  context.searchAbortController = abortController;
  context.results.textContent = context.root.dataset.searchingLabel ?? 'Searching...';
  setResultsExpanded(context, true);

  try {
    const results = await runSearch(query, abortController.signal);

    if (requestId !== context.searchRequestId) {
      return;
    }

    renderSearchResults(context, results);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return;
    }

    resetResultsState(context, context.root.dataset.searchErrorLabel ?? 'Search error');
  } finally {
    if (context.searchAbortController === abortController) {
      context.searchAbortController = null;
    }
  }
}

function queueSearch(context: PickerContext) {
  clearDebounce(context);
  context.searchDebounceId = window.setTimeout(() => {
    void executeSearch(context);
  }, 220);
}

function handleQueryKeydown(context: PickerContext, event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    if (context.searchResults.length > 0) {
      event.preventDefault();
      updateActiveResult(context, context.activeResultIndex + 1);
      setResultsExpanded(context, true);
      return;
    }

    void executeSearch(context);
    return;
  }

  if (event.key === 'ArrowUp' && context.searchResults.length > 0) {
    event.preventDefault();
    updateActiveResult(context, context.activeResultIndex - 1);
    setResultsExpanded(context, true);
    return;
  }

  if (event.key === 'Enter') {
    if (context.searchResults.length > 0 && context.activeResultIndex >= 0) {
      event.preventDefault();
      const result = context.searchResults[context.activeResultIndex];

      if (result) {
        applySearchResult(context, result);
      }

      return;
    }

    event.preventDefault();
    void executeSearch(context);
    return;
  }

  if (event.key === 'Escape') {
    resetResultsState(context, context.root.dataset.initialResults ?? '');
  }
}

export function initLocationPickers() {
  document.querySelectorAll<HTMLElement>('[data-location-picker]').forEach((root) => {
    const existingContext = pickerContexts.get(root);

    if (existingContext) {
      const existingLat = Number(existingContext.latInput.value);
      const existingLng = Number(existingContext.lngInput.value);

      clearDebounce(existingContext);
      abortInFlightSearch(existingContext);

      if (!Number.isNaN(existingLat) && !Number.isNaN(existingLng) && existingContext.nameInput.value) {
        applySelection(existingContext, {
          name: existingContext.nameInput.value,
          lat: existingLat,
          lng: existingLng,
        });
      } else {
        resetResultsState(existingContext, root.dataset.initialResults ?? '');
        applySelection(existingContext, null);
      }

      setTimeout(() => existingContext.map.invalidateSize(), 0);
      return;
    }

    const context = createPickerContext(root);

    if (!context) {
      return;
    }

    pickerContexts.set(root, context);

    context.searchButton.addEventListener('click', () => {
      void executeSearch(context);
    });

    context.queryInput.addEventListener('input', () => {
      if (!context.queryInput.value.trim()) {
        clearDebounce(context);
        abortInFlightSearch(context);
        resetResultsState(context, root.dataset.initialResults ?? '');
        applySelection(context, null);
        return;
      }

      if (context.nameInput.value && context.queryInput.value.trim() !== context.nameInput.value) {
        clearSelectionData(context);
      }

      queueSearch(context);
    });

    context.queryInput.addEventListener('keydown', (event) => {
      handleQueryKeydown(context, event);
    });

    context.queryInput.addEventListener('focus', () => {
      if (context.searchResults.length > 0) {
        setResultsExpanded(context, true);
      }
    });

    context.clearButton.addEventListener('click', () => {
      clearDebounce(context);
      abortInFlightSearch(context);
      context.queryInput.value = '';
      resetResultsState(context, root.dataset.initialResults ?? '');
      applySelection(context, null);
    });

    context.currentButton?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        resetResultsState(context, context.root.dataset.searchErrorLabel ?? 'Search error');
        return;
      }

      context.currentButton.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          context.currentButton?.removeAttribute('disabled');
          const { latitude, longitude } = position.coords;

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            resetResultsState(context, context.root.dataset.searchErrorLabel ?? 'Search error');
            return;
          }

          applySelection(context, {
            name: context.root.dataset.currentLocationLabel ?? context.root.dataset.unnamedLabel ?? 'Current location',
            lat: latitude,
            lng: longitude,
          });
          resetResultsState(context, context.root.dataset.initialResults ?? '');
        },
        () => {
          context.currentButton?.removeAttribute('disabled');
          resetResultsState(context, context.root.dataset.searchErrorLabel ?? 'Search error');
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
      );
    });

    root.dataset.ready = 'true';
  });
}
