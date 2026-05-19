import { nearbyPoiCategories, nearbyPoiResultLimit } from './poi';

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

export const defaultMapLayerId = 'voyager';

export const mapLayers: MapLayerConfig[] = [
  {
    id: 'voyager',
    labelKey: 'map.layers.voyager',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    theme: 'mixed',
    maxZoom: 20,
    subdomains: 'abcd',
  },
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
    subdomains: 'abcd',
  },
  {
    id: 'dark',
    labelKey: 'map.layers.dark',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    theme: 'dark',
    maxZoom: 20,
    subdomains: 'abcd',
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

export const mapPoiLimit = Math.min(nearbyPoiResultLimit, 20);

export const mapPoiCategories = nearbyPoiCategories.filter((category) =>
  ['food', 'culture', 'transport', 'parks'].includes(category.id),
);
