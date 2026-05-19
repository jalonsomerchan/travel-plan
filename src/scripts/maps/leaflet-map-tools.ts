import L from 'leaflet';
import { addMapLayerSelector } from './layers';
import { addOpenInGoogleMapsControl } from './google';
import { addCurrentLocationControl } from './location';
import { addPoiControl } from './pois';
import type { MapTranslate } from './layers';

export function addMapTools(map: L.Map, t: MapTranslate) {
  addMapLayerSelector(map, t);
  addCurrentLocationControl(map, t);
  addOpenInGoogleMapsControl(map, t);
  addPoiControl(map, t);
}
