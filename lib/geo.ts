import 'server-only';
import { headers } from 'next/headers';

export type Geo = {
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

function isPrivateIp(ip: string) {
  return (
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80')
  );
}

const decode = (v: string | null) => {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

const num = (v: string | null | undefined) => {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Where is this request coming from? Uses Vercel's free geo headers when deployed,
 * and falls back to a keyless lookup (ipwho.is) elsewhere.
 */
export async function getRequestGeo(): Promise<Geo> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || '').trim() || null;

  const geo: Geo = {
    ip,
    city: decode(h.get('x-vercel-ip-city')),
    region: decode(h.get('x-vercel-ip-country-region')),
    country: h.get('x-vercel-ip-country'),
    latitude: num(h.get('x-vercel-ip-latitude')),
    longitude: num(h.get('x-vercel-ip-longitude')),
  };
  if (geo.city || !ip || isPrivateIp(ip)) return geo;

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region_code,country_code,latitude,longitude`, {
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
    const j = await res.json();
    if (j?.success) {
      geo.city = j.city ?? null;
      geo.region = j.region_code ?? null;
      geo.country = j.country_code ?? null;
      geo.latitude = num(j.latitude);
      geo.longitude = num(j.longitude);
    }
  } catch {
    // Location is best-effort.
  }
  return geo;
}
