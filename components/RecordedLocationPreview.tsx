'use client';

import type {SexSession} from '@/lib/types';
import {useT} from './I18nProvider';
import {MapPinMap} from './MapPinPicker';

export type RecordedLocation=Pick<SexSession,'latitude'|'longitude'|'city'|'region'|'country'|'geoSource'>;

/** Preview the recording's captured location, without requesting or changing its coordinates. */
export function RecordedLocationPreview({location:s}:{location?:RecordedLocation}) {
  const {t}=useT();
  const pin=s?.latitude!=null&&s.longitude!=null?{latitude:s.latitude,longitude:s.longitude}:null;
  const area=s?[s.city,s.region,s.country].filter(Boolean).join(', '):'';
  const captured=!!(area||pin||s?.geoSource);
  const source=s?.geoSource==='gps'?t('Device GPS pin'):s?.geoSource==='map'?t('Map pin'):t('Approximate IP pin');
  return <section className="space-y-2" aria-label={t('Recorded location')}>
    <h3 className="label">{t('Recorded location')}</h3>
    {captured?<>
      <p className="break-words text-sm text-ink-2">{area||t(pin?'Unnamed map location':'Unknown location')}</p>
      <p className="text-xs text-ink-3">{source}</p>
      {pin&&<MapPinMap value={pin}/>}
    </>:<p className="text-sm text-ink-3">{t('No recorded location')}</p>}
  </section>;
}
