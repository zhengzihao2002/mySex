import type { GpsArea } from './gps-area';
import type { Geo } from './geo';
import type { GpsCoordinates } from './gps';

export function sessionLocation(geo: Geo, useLocation: boolean, gps?: GpsCoordinates | null, area?: GpsArea | null) {
  if (!useLocation) return { ip: null, city: null, region: null, country: null, latitude: null, longitude: null, source: null };
  return {
    ...geo,
    ...(gps ? { city:area?.city ?? null, region:area?.region ?? null, country:area?.country ?? null } : {}),
    latitude: gps?.latitude ?? geo.latitude,
    longitude: gps?.longitude ?? geo.longitude,
    source: gps ? 'gps' as const : 'ip' as const,
  };
}
