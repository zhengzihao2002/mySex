import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { GpsCoordinates } from './gps';
export type GpsArea = { city: string; region: string | null; country: string | null };

const name = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null;
/** Prefer a local neighbourhood/suburb, then include its town/city for context. */
export function parseGpsArea(value: unknown): GpsArea | null {
  if (!value || typeof value !== 'object') return null;
  const address = (value as { address?: Record<string, unknown> }).address;
  if (!address || typeof address !== 'object') return null;
  const area = ['neighbourhood','suburb','quarter','city_district','borough'].map(k => name(address[k])).find(Boolean);
  const town = ['city','town','village','municipality','hamlet','county'].map(k => name(address[k])).find(Boolean);
  const parts = [...new Set([area, town].filter(Boolean))];
  if (!parts.length) return null;
  const code = name(address.country_code);
  return { city: parts.join(', '), region: name(address.state) ?? name(address.region), country: code && /^[a-z]{2}$/i.test(code) ? code.toUpperCase() : null };
}

/** Search and reverse lookup share Nominatim's one-request/sec application limit. */
export async function claimGeocodingSlot(client: NeonQueryFunction<false, false>): Promise<boolean> {
  const claimed = await client`insert into app_maintenance(name,last_run) values ('gps-area-lookup',clock_timestamp())
    on conflict(name) do update set last_run=excluded.last_run
    where app_maintenance.last_run <= clock_timestamp()-interval '1 second' returning name`;
  return claimed.length > 0;
}

export async function getGpsArea(client: NeonQueryFunction<false, false>, gps: GpsCoordinates): Promise<GpsArea | null> {
  if (!await claimGeocodingSlot(client)) return null;
  const params = new URLSearchParams({ format:'jsonv2',addressdetails:'1',zoom:'18',lat:String(gps.latitude),lon:String(gps.longitude),'accept-language':'en' });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent':'mySex/1.0 (+https://github.com/zhengzihao2002/mySex)', Accept:'application/json' },
      signal:AbortSignal.timeout(2000), cache:'no-store',
    });
    return response.ok ? parseGpsArea(await response.json()) : null;
  } catch { return null; }
}
