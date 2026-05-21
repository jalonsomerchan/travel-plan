import { getTripPoiDefaultIcon } from './trip-pois';

const presetPoiIcons: Record<string, string> = {
  airport: 'A',
  bar: 'B',
  bus: 'B',
  camera: '◎',
  coffee: 'C',
  fountain: 'F',
  food: '◆',
  metro: 'M',
  pin: '●',
  star: '★',
  train: 'T',
  view: '▲',
  wc: 'WC',
};

export function resolveTripPoiIcon(icon: string | undefined, type?: string) {
  const value = icon?.trim() ?? '';

  if (!value) {
    return presetPoiIcons[getTripPoiDefaultIcon(type)] ?? presetPoiIcons.pin;
  }

  return presetPoiIcons[value] ?? value;
}
