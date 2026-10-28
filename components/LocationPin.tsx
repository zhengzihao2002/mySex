'use client';
import { useT } from './I18nProvider';
import type { SexSession } from '@/lib/types';
import {MapPinPreview} from './MapPinPicker';

/** Display the saved pin and attribute GPS area names to their source. */
export function LocationPin({ location: s }: { location: Pick<SexSession, 'latitude' | 'longitude' | 'geoSource'> }) {
  const { t } = useT();
  if (s.latitude == null || s.longitude == null) return null;
  return <div className="mt-2 text-xs text-ink-3">
    <span>{s.geoSource === 'map' ? t('Map pin') : s.geoSource === 'gps' ? t('Device GPS pin') : t('Approximate IP pin')}</span>
    <MapPinPreview value={{latitude:s.latitude,longitude:s.longitude}} openLabel={t('Open map')}/>
  </div>;
}
