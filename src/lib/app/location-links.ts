export function getGoogleMapsPlaceUrl(locationName: string) {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', locationName);
  return url.toString();
}

export function getOpenStreetMapPlaceUrlFromCoordinates(latitude: number, longitude: number) {
  const url = new URL('https://www.openstreetmap.org/');
  url.searchParams.set('mlat', String(latitude));
  url.searchParams.set('mlon', String(longitude));
  url.hash = `map=18/${latitude}/${longitude}`;
  return url.toString();
}

export function getGoogleMapsPlaceUrlFromCoordinates(latitude: number, longitude: number) {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', `${latitude},${longitude}`);
  return url.toString();
}

export function getGoogleMapsDirectionsUrl(latitude: number, longitude: number) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${latitude},${longitude}`);
  return url.toString();
}
