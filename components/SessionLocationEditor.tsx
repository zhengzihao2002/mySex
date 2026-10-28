'use client';

import type {GpsCoordinates} from '@/lib/gps';
import {samePin,type SessionProposal} from '@/lib/shared-session';
import type {RecordedLocation} from './RecordedLocationPreview';
import {useT} from './I18nProvider';
import {MapPinPicker} from './MapPinPicker';
import {useState} from 'react';

/** A single location summary and editor, including any pending change. */
export function SessionLocationEditor({value,onChange,saved,proposed,originalPin}:{
  value:GpsCoordinates|null;onChange:(pin:GpsCoordinates|null)=>void;saved?:RecordedLocation;
  proposed?:SessionProposal['location'];originalPin?:GpsCoordinates|null;
}) {
  const {t}=useT();
  const [selection,setSelection]=useState<{pin:GpsCoordinates;label:string}|null>(null);
  const original=originalPin??(saved?.latitude!=null&&saved.longitude!=null?{latitude:saved.latitude,longitude:saved.longitude}:null);
  const name=(location?:Pick<RecordedLocation,'city'|'region'|'country'>)=>location?[location.city,location.region,location.country].filter(Boolean).join(', '):'';
  const savedName=name(saved)||(original?t('Unnamed map location'):t('No recorded location'));
  const changed=!samePin(value,original);
  const newName=selection&&samePin(value,selection.pin)?selection.label:samePin(value,proposed)?name(proposed):'';
  return <section className="space-y-2" aria-label={t('Recorded location')}>
    <h3 className="label">{t('Recorded location')}</h3>
    {changed?<p className="break-words text-sm"><del className="text-ink-3">{savedName}</del><span aria-hidden="true"> → </span><b>{newName||t('New map location')}</b></p>:<p className="break-words text-sm text-ink-2">{savedName}</p>}
    {saved?.geoSource&&<p className="text-xs text-ink-3">{changed||saved.geoSource==='map'?t('Map pin'):saved.geoSource==='gps'?t('Device GPS pin'):t('Approximate IP pin')}</p>}
    <MapPinPicker value={value} originalValue={original} onChange={(pin,label)=>{setSelection(pin&&label?{pin,label}:null);onChange(pin);}}/>
  </section>;
}
