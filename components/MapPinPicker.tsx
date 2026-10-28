'use client';

import {useEffect, useRef, useState} from 'react';
import {MapPin} from 'lucide-react';
import type {GpsCoordinates} from '@/lib/gps';
import {useT} from './I18nProvider';
import 'leaflet/dist/leaflet.css';

/** Coordinates can only be changed by placing or dragging a pin on the map. */
export function MapPinPicker({value, onChange}: {value: GpsCoordinates | null; onChange: (pin: GpsCoordinates) => void}) {
  const {t} = useT();
  const [open, setOpen] = useState(false);
  return <div className="mt-3 space-y-2">
    <button type="button" className="btn-ghost w-full" aria-expanded={open} onClick={() => setOpen(!open)}>
      <MapPin size={16}/>{open ? t('Hide map') : value ? t('Edit map pin') : t('Add map pin')}
    </button>
    {open && <InteractiveMap value={value} onChange={onChange}/>}
  </div>;
}

export function MapPinPreview({value,openLabel}: {value: GpsCoordinates;openLabel?:string}) {
  const {t}=useT();
  const [open,setOpen]=useState(false);
  return <div className="mt-2 space-y-2"><button type="button" className="chip" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?t('Hide map'):openLabel??t('View map')}</button>{open&&<InteractiveMap value={value} onChange={()=>{}} readOnly/>}</div>;
}

export function MapPinMap({value}: {value:GpsCoordinates}) {
  return <InteractiveMap value={value} onChange={()=>{}} readOnly/>;
}

function InteractiveMap({value, onChange, readOnly=false}: {value: GpsCoordinates | null; onChange: (pin: GpsCoordinates) => void; readOnly?: boolean}) {
  const {t} = useT();
  const container = useRef<HTMLDivElement>(null);
  const initial = useRef(value);
  const change = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {change.current = onChange;}, [onChange]);
  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | undefined;
    let observer: ResizeObserver | undefined;
    setReady(false);
    setError(false);
    void import('leaflet').then(L => {
      if (disposed || !container.current) return;
      const pin = initial.current;
      map = L.map(container.current, {scrollWheelZoom: false, minZoom: 2, maxZoom: 19, maxBounds: [[-85,-180],[85,180]], maxBoundsViscosity: 1})
        .setView(pin ? [pin.latitude,pin.longitude] : [20,0], pin ? 15 : 2);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        noWrap: true, maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      tiles.on('tileerror', () => {if (!disposed) setError(true);});
      const icon = L.divIcon({className: 'session-map-pin', iconSize: [32,42], iconAnchor: [16,42], html: '<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 40C13 35 2 25 2 16a14 14 0 0 1 28 0c0 9-11 19-14 24Z" fill="#ff3d7f" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="white"/></svg>'});
      let marker: import('leaflet').Marker | undefined;
      const place = (latlng: import('leaflet').LatLng, notify: boolean) => {
        const point = {latitude: Number(Math.max(-85,Math.min(85,latlng.lat)).toFixed(6)), longitude: Number(Math.max(-180,Math.min(180,latlng.lng)).toFixed(6))};
        if (!marker) {
          marker = L.marker([point.latitude,point.longitude], {icon, draggable: !readOnly, title: readOnly?t('Map pin'):t('Drag the pin to adjust the location')}).addTo(map!);
          if (!readOnly) marker.on('dragend', () => place(marker!.getLatLng(), true));
        } else marker.setLatLng([point.latitude,point.longitude]);
        if (notify) change.current(point);
      };
      if (pin) place(L.latLng(pin.latitude,pin.longitude), false);
      if (!readOnly) map.on('click', (e: import('leaflet').LeafletMouseEvent) => place(e.latlng, true));
      observer = new ResizeObserver(() => map?.invalidateSize({pan:false}));
      observer.observe(container.current);
      setReady(true);
    }).catch(() => {if (!disposed) setError(true);});
    return () => {disposed = true; observer?.disconnect(); map?.remove();};
  }, [attempt,t,readOnly]);
  return <div className="space-y-2">
    {!readOnly&&<p className="text-xs text-ink-3">{t('Tap the map to place your pin. Drag it to adjust.')}</p>}
    <div className="relative isolate h-72 overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div ref={container} role="region" aria-label={t('Location map')} className="relative z-0 h-full w-full"/>
      {!ready && <p role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-3">{t('Loading map…')}</p>}
    </div>
    {error && <div className="flex items-center gap-2 text-xs text-ink-3"><span>{t('The map could not load. Check your connection and try again.')}</span><button type="button" className="chip" onClick={() => {initial.current=value;setAttempt(n=>n+1);}}>{t('Retry')}</button></div>}
  </div>;
}
