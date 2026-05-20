import L from 'leaflet';
import { addMapLayerSelector } from './layers';
import { addOpenInGoogleMapsControl } from './google';
import { addCurrentLocationControl } from './location';
import { addPoiControl } from './pois';
import type { MapTranslate } from './layers';

interface MapToolsOptions {
  currentLocation?: {
    centerOnLocation?: boolean;
    locateOnLoad?: boolean;
  };
}

export function addMapTools(map: L.Map, t: MapTranslate, options: MapToolsOptions = {}) {
  addMapLayerSelector(map, t);
  addCurrentLocationControl(map, t, options.currentLocation);
  addOpenInGoogleMapsControl(map, t);
  addPoiControl(map, t);
}
