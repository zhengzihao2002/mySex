'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {MapPin} from 'lucide-react';
import type {GpsCoordinates} from '@/lib/gps';
import type {AddressPlace} from '@/lib/address-search';
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
  const {t,lang} = useT();
  const container = useRef<HTMLDivElement>(null);
  const initial = useRef(value);
  const change = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query,setQuery]=useState('');
  const searchId=useId();
  const [searching,setSearching]=useState(false);
  const [results,setResults]=useState<AddressPlace[]|null>(null);
  const [searchError,setSearchError]=useState<string|null>(null);
  const searchRequest=useRef<AbortController|null>(null);
  const chooseAddress=useRef<((place:AddressPlace)=>void)|null>(null);
  useEffect(()=>()=>{searchRequest.current?.abort();},[]);
  useEffect(() => {change.current = onChange;}, [onChange]);
  useEffect(() => {
    let disposed = false;
    const locationRequest=new AbortController();
    let map: import('leaflet').Map | undefined;
    let observer: ResizeObserver | undefined;
    setReady(false);
    setError(false);
    const nearby=!readOnly&&!initial.current?(async()=>{
      const timeout=setTimeout(()=>locationRequest.abort(),2000);
      try{const response=await fetch('/api/locations/context',{signal:locationRequest.signal});return response.ok?await response.json() as {latitude:number|null;longitude:number|null;region:string|null;country:string|null}:null;}catch{return null;}finally{clearTimeout(timeout);}
    })():Promise.resolve(null);
    void Promise.all([import('leaflet'),nearby]).then(([L,area]) => {
      if (disposed || !container.current) return;
      const pin = initial.current;
      const local=area?.latitude!=null&&area.longitude!=null&&Number.isFinite(area.latitude)&&Number.isFinite(area.longitude)?area:null;
      map = L.map(container.current, {scrollWheelZoom: false, zoomControl:false, minZoom: 2, maxZoom: 19, maxBounds: [[-85,-180],[85,180]], maxBoundsViscosity: 1})
        .setView(pin ? [pin.latitude,pin.longitude] : local ? [Math.max(-85,Math.min(85,local.latitude!)),local.longitude!] : [20,0], pin ? 15 : local ? local.region?7:5 : 2);
      map.attributionControl.setPrefix(false);
      L.control.zoom({zoomInTitle:t('Zoom in'),zoomOutTitle:t('Zoom out')}).addTo(map);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        noWrap: true, maxZoom: 19, attribution: `&copy; ${t('OpenStreetMap')} · ODbL`,
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
      chooseAddress.current=result=>{
        place(L.latLng(result.latitude,result.longitude),true);
        map?.flyTo([result.latitude,result.longitude],16,{duration:0.6});
        container.current?.focus({preventScroll:true});
      };
      observer = new ResizeObserver(() => map?.invalidateSize({pan:false}));
      observer.observe(container.current);
      setReady(true);
    }).catch(() => {if (!disposed) setError(true);});
    return () => {disposed = true; locationRequest.abort();chooseAddress.current=null; observer?.disconnect(); map?.remove();};
  }, [attempt,t,readOnly]);
  const search=async()=>{
    const address=query.trim();
    if (!ready||searching||address.length<3||address.length>200) return;
    const controller=new AbortController();
    searchRequest.current?.abort();searchRequest.current=controller;
    setSearching(true);setSearchError(null);setResults(null);
    try {
      const response=await fetch('/api/locations/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:address,lang}),signal:controller.signal});
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(response.status===429?'busy':response.status===401?'auth':'unavailable');
      const data=await response.json() as {places:AddressPlace[]};
      if (!controller.signal.aborted) setResults(data.places);
    } catch (e) {
      if (!controller.signal.aborted) setSearchError(e instanceof Error&&e.message==='busy'?t('Please wait a moment and search again.'):e instanceof Error&&e.message==='auth'?t('Sign in again to search addresses.'):t('Address search is unavailable. Please try again.'));
    } finally {if(searchRequest.current===controller){searchRequest.current=null;if(!controller.signal.aborted)setSearching(false);}}
  };
  return <div className="space-y-2">
    {!readOnly&&<div className="space-y-2" aria-busy={searching}>
      <label className="sr-only" htmlFor={searchId}>{t('Search by address')}</label><div className="flex gap-2"><input id={searchId} className="input min-w-0 flex-1" aria-label={t('Address or place')} placeholder={t('Street address, city, or place')} value={query} maxLength={200} autoComplete="off"
        onChange={e=>{searchRequest.current?.abort();searchRequest.current=null;setQuery(e.target.value);setSearching(false);setResults(null);setSearchError(null);}}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();e.stopPropagation();void search();}}}/><button type="button" className="btn-ghost shrink-0" disabled={!ready||searching||query.trim().length<3} onClick={()=>void search()}>{searching?t('Searching…'):t('Search')}</button></div>
      {searchError&&<p role="alert" className="text-xs text-menstrual">{searchError}</p>}
      {results&&<div role="status" className="space-y-1">{results.length?results.map((result,i)=><button key={i} type="button" disabled={!ready} className="block w-full rounded-xl border border-line bg-surface-2 p-3 text-left text-sm text-ink-2" onClick={()=>{chooseAddress.current?.(result);setQuery(result.label.slice(0,200));setResults(null);}}>{result.label}</button>):<p className="text-xs text-ink-3">{t('No matching addresses. Try adding the city or postcode.')}</p>}</div>}
    </div>}
    <div className="relative isolate h-72 overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div ref={container} role="region" aria-label={t('Location map')} className="relative z-0 h-full w-full"/>
      {!ready && <p role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-3">{t('Loading map…')}</p>}
    </div>
    {error && <div className="flex items-center gap-2 text-xs text-ink-3"><span>{t('The map could not load. Check your connection and try again.')}</span><button type="button" className="chip" onClick={() => {initial.current=value;setAttempt(n=>n+1);}}>{t('Retry')}</button></div>}
  </div>;
}
