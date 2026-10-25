'use client';
import { useT } from './I18nProvider';
import type { SexSession } from '@/lib/types';

/** City names describe the network lookup. The map always uses the actual saved pin. */
export function LocationPin({ location: s }: { location: Pick<SexSession, 'latitude' | 'longitude' | 'geoSource'> }) {
  const { t } = useT();
  if (s.latitude == null || s.longitude == null) return null;
  return <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-3">
    <span>{s.geoSource === 'gps' ? t('Device GPS pin') : t('Approximate IP pin')} · {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}</span>
    <a className="text-rose-2" href={`https://maps.apple.com/?ll=${s.latitude},${s.longitude}&q=Here`} target="_blank" rel="noreferrer">{t('Open map')}</a>
    {s.geoSource === 'gps' && <span className="w-full text-center">{t('The city label comes from your network; the map uses your device coordinates.')}</span>}
  </p>;
}
