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
}

const pickerContexts = new WeakMap<HTMLElement, PickerContext>();

function setSummary(context: PickerContext, html: string) {
  context.summary.innerHTML = html;
}

function setInitialMessages(context: PickerContext) {
  context.root.dataset.initialResults = context.results.textContent?.trim() ?? '';
  context.root.dataset.initialSummary = context.summary.textContent?.trim() ?? '';
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
  context.marker.setLatLng([selection.lat, selection.lng]);
  context.marker.setStyle({ opacity: 1, fillOpacity: 0.85 });
  context.map.setView([selection.lat, selection.lng], 14);
  setSummary(
    context,
    `<strong>${context.root.dataset.selectedLabel ?? 'Selected'}:</strong> ${selection.name}`,
  );
}

async function runSearch(query: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  return (await response.json()) as SearchResult[];
}

function renderSearchResults(context: PickerContext, results: SearchResult[]) {
  if (results.length === 0) {
    context.results.textContent = context.root.dataset.noResultsLabel ?? 'No results';
    return;
  }

  context.results.innerHTML = results
    .map(
      (result, index) => `
        <button class="location-result-button" type="button" data-location-result-index="${index}">
          <span class="location-result-title">${result.display_name}</span>
          <span class="location-result-meta">${Number(result.lat).toFixed(5)}, ${Number(result.lon).toFixed(5)}</span>
        </button>
      `,
    )
    .join('');

  context.results.querySelectorAll<HTMLButtonElement>('[data-location-result-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const result = results[Number(button.dataset.locationResultIndex ?? 0)];
      applySelection(context, {
        name: result.display_name,
        lat: Number(result.lat),
        lng: Number(result.lon),
      });
    });
  });
}

function createPickerContext(root: HTMLElement) {
  const mapElement = root.querySelector<HTMLElement>('[data-location-map]');
  const queryInput = root.querySelector<HTMLInputElement>('[data-location-query]');
  const results = root.querySelector<HTMLElement>('[data-location-search-results]');
  const summary = root.querySelector<HTMLElement>('[data-location-selected-summary]');
  const nameInput = root.querySelector<HTMLInputElement>('[data-location-name]');
  const latInput = root.querySelector<HTMLInputElement>('[data-location-lat]');
  const lngInput = root.querySelector<HTMLInputElement>('[data-location-lng]');

  if (!mapElement || !queryInput || !results || !summary || !nameInput || !latInput || !lngInput) {
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
  };

  setInitialMessages(context);

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

export function initLocationPickers() {
  document.querySelectorAll<HTMLElement>('[data-location-picker]').forEach((root) => {
    const existingContext = pickerContexts.get(root);
    if (existingContext) {
      const existingLat = Number(existingContext.latInput.value);
      const existingLng = Number(existingContext.lngInput.value);

      if (!Number.isNaN(existingLat) && !Number.isNaN(existingLng) && existingContext.nameInput.value) {
        applySelection(existingContext, {
          name: existingContext.nameInput.value,
          lat: existingLat,
          lng: existingLng,
        });
      } else {
        existingContext.results.textContent = root.dataset.initialResults ?? '';
        applySelection(existingContext, null);
      }

      setTimeout(() => existingContext.map.invalidateSize(), 0);
      return;
    }

    const context = createPickerContext(root);
    const searchButton = root.querySelector<HTMLButtonElement>('[data-location-search-button]');
    const clearButton = root.querySelector<HTMLButtonElement>('[data-location-clear-button]');

    if (!context || !searchButton || !clearButton) {
      return;
    }

    pickerContexts.set(root, context);

    const executeSearch = async () => {
      const query = context.queryInput.value.trim();

      if (!query) {
        context.results.textContent = root.dataset.emptyQueryLabel ?? 'Write a location to search';
        return;
      }

      context.results.textContent = root.dataset.searchingLabel ?? 'Searching...';

      try {
        const results = await runSearch(query);
        renderSearchResults(context, results);
      } catch (_error) {
        context.results.textContent = root.dataset.searchErrorLabel ?? 'Search error';
      }
    };

    searchButton.addEventListener('click', executeSearch);
    context.queryInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        executeSearch();
      }
    });

    clearButton.addEventListener('click', () => {
      context.queryInput.value = '';
      context.results.textContent = root.dataset.initialResults ?? '';
      applySelection(context, null);
    });

    root.dataset.ready = 'true';
  });
}
