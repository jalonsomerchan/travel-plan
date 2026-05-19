export const nearbyPoiRadiusOptions = [250, 500, 1000, 2000, 5000] as const;
export const nearbyPoiDefaultRadius = 1000;
export const nearbyPoiMaxRadius = 5000;
export const nearbyPoiResultLimit = 50;
export const nearbyPoiRequestTimeoutMs = 12000;

export interface NearbyPoiTagFilter {
  key: string;
  value: string;
  useRegex?: boolean;
}

export interface NearbyPoiCategoryConfig {
  id: string;
  labelKey: string;
  overpassFilters: NearbyPoiTagFilter[];
}

export const nearbyPoiCategories: NearbyPoiCategoryConfig[] = [
  {
    id: 'food',
    labelKey: 'poi.category.food',
    overpassFilters: [
      { key: 'amenity', value: '^(restaurant|cafe|bar|pub|fast_food|ice_cream)$', useRegex: true },
    ],
  },
  {
    id: 'culture',
    labelKey: 'poi.category.culture',
    overpassFilters: [
      { key: 'tourism', value: '^(museum|gallery|artwork|attraction)$', useRegex: true },
      { key: 'amenity', value: '^(theatre|arts_centre|cinema|library)$', useRegex: true },
      { key: 'historic', value: '.+', useRegex: true },
    ],
  },
  {
    id: 'parks',
    labelKey: 'poi.category.parks',
    overpassFilters: [
      { key: 'leisure', value: '^(park|garden|nature_reserve)$', useRegex: true },
      { key: 'tourism', value: 'viewpoint' },
      { key: 'natural', value: 'peak' },
    ],
  },
  {
    id: 'transport',
    labelKey: 'poi.category.transport',
    overpassFilters: [
      { key: 'public_transport', value: '.+', useRegex: true },
      { key: 'amenity', value: '^(bus_station|ferry_terminal|taxi)$', useRegex: true },
      { key: 'railway', value: '^(station|halt|tram_stop|subway_entrance)$', useRegex: true },
      { key: 'highway', value: 'bus_stop' },
    ],
  },
  {
    id: 'shops',
    labelKey: 'poi.category.shops',
    overpassFilters: [
      { key: 'shop', value: '.+', useRegex: true },
    ],
  },
  {
    id: 'toilets',
    labelKey: 'poi.category.toilets',
    overpassFilters: [
      { key: 'amenity', value: 'toilets' },
    ],
  },
  {
    id: 'water',
    labelKey: 'poi.category.water',
    overpassFilters: [
      { key: 'amenity', value: 'drinking_water' },
      { key: 'drinking_water', value: 'yes' },
      { key: 'man_made', value: 'water_tap' },
    ],
  },
  {
    id: 'leisure',
    labelKey: 'poi.category.leisure',
    overpassFilters: [
      { key: 'leisure', value: '^(playground|sports_centre|stadium|fitness_centre|marina)$', useRegex: true },
      { key: 'amenity', value: '^(nightclub|casino)$', useRegex: true },
      { key: 'tourism', value: '^(theme_park|zoo|aquarium)$', useRegex: true },
    ],
  },
];
