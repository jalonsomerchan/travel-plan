export const tripPoiTypeValues = [
  'restaurant',
  'cafe',
  'public_toilet',
  'metro_station',
  'train_station',
  'bus_station',
  'airport',
  'fountain',
  'bar',
  'landmark',
  'other',
] as const;

export type TripPoiType = (typeof tripPoiTypeValues)[number];

export const defaultTripPoiType: TripPoiType = 'other';

export const tripPoiTypeMeta: Record<TripPoiType, { defaultColor: string; defaultIcon: string }> = {
  restaurant: { defaultColor: '#ef4444', defaultIcon: 'food' },
  cafe: { defaultColor: '#c08457', defaultIcon: 'coffee' },
  public_toilet: { defaultColor: '#0ea5e9', defaultIcon: 'wc' },
  metro_station: { defaultColor: '#2563eb', defaultIcon: 'metro' },
  train_station: { defaultColor: '#1d4ed8', defaultIcon: 'train' },
  bus_station: { defaultColor: '#7c3aed', defaultIcon: 'bus' },
  airport: { defaultColor: '#0f766e', defaultIcon: 'airport' },
  fountain: { defaultColor: '#06b6d4', defaultIcon: 'fountain' },
  bar: { defaultColor: '#d97706', defaultIcon: 'bar' },
  landmark: { defaultColor: '#f59e0b', defaultIcon: 'star' },
  other: { defaultColor: '#475569', defaultIcon: 'pin' },
};
