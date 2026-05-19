export type MapLayerTheme = 'light' | 'dark' | 'mixed';

export interface MapLayerConfig {
  id: string;
  labelKey: string;
  urlTemplate: string;
  attribution: string;
  theme: MapLayerTheme;
  maxZoom?: number;
  subdomains?: string | string[];
}

export const defaultMapLayerId = 'osm';

export const mapLayers: MapLayerConfig[] = [
  {
    id: 'osm',
    labelKey: 'map.layers.osm',
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    theme: 'mixed',
    maxZoom: 19,
  },
  {
    id: 'light',
    labelKey: 'map.layers.light',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    theme: 'light',
    maxZoom: 20,
  },
  {
    id: 'dark',
    labelKey: 'map.layers.dark',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    theme: 'dark',
    maxZoom: 20,
  },
  {
    id: 'satellite',
    labelKey: 'map.layers.satellite',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    theme: 'mixed',
    maxZoom: 19,
  },
];

export interface MapPoiCategoryConfig {
  id: string;
  labelKey: string;
  overpassFilters: string[];
}

export const mapPoiLimit = 20;

export const mapPoiCategories: MapPoiCategoryConfig[] = [
  {
    id: 'food',
    labelKey: 'map.poi.food',
    overpassFilters: ['node["amenity"~"^(restaurant|cafe|bar)$"]'],
  },
  {
    id: 'museum',
    labelKey: 'map.poi.museum',
    overpassFilters: ['node["tourism"="museum"]'],
  },
  {
    id: 'transport',
    labelKey: 'map.poi.transport',
    overpassFilters: ['node["railway"="station"]', 'node["amenity"="bus_station"]'],
  },
  {
    id: 'viewpoint',
    labelKey: 'map.poi.viewpoint',
    overpassFilters: ['node["tourism"="viewpoint"]'],
  },
];
