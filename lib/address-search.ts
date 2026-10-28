import type {NeonQueryFunction} from '@neondatabase/serverless';
import {claimGeocodingSlot} from './gps-area.ts';
import {formatAddress} from './map-labels.ts';

export type AddressPlace = {label: string; latitude: number; longitude: number};
export type SearchArea={latitude:number|null;longitude:number|null};
export function parseAddressResults(value: unknown,lang:'en'|'zh'='en'): AddressPlace[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row: unknown): AddressPlace[] => {
    if (!row || typeof row !== 'object') return [];
    const r=row as Record<string,unknown>;
    if (typeof r.display_name !== 'string' || !r.display_name.trim()) return [];
    const number=(v:unknown)=>typeof v==='number'||(typeof v==='string'&&v.trim())?Number(v):NaN;
    const latitude=number(r.lat),longitude=number(r.lon);
    if (!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>85||Math.abs(longitude)>180) return [];
    const label=formatAddress(r,lang).slice(0,500);
    return label?[{label,latitude,longitude}]:[];
  }).slice(0,5);
}

/** Explicit submitted searches only: no keystroke autocomplete or stored search history. */
export async function searchAddresses(client:NeonQueryFunction<false,false>,query:string,lang:'en'|'zh',nearby?:SearchArea):
Promise<{places:AddressPlace[]}|{error:'invalid'|'busy'|'unavailable'}> {
  const q=query.trim();
  if (q.length<3||q.length>200) return {error:'invalid'};
  if (!await claimGeocodingSlot(client)) return {error:'busy'};
  const params=new URLSearchParams({q,format:'jsonv2',limit:'5',addressdetails:'1',namedetails:'1','accept-language':lang==='zh'?'zh-Hans,zh-CN,zh,en':'en'});
  const center=nearby?.latitude!=null&&nearby.longitude!=null&&Number.isFinite(nearby.latitude)&&Number.isFinite(nearby.longitude)?{latitude:nearby.latitude,longitude:nearby.longitude}:null;
  if(center){
    params.set('viewbox',[Math.max(-180,center.longitude-1.5),Math.min(85,center.latitude+1),Math.min(180,center.longitude+1.5),Math.max(-85,center.latitude-1)].join(','));
    params.set('bounded','0'); // Prefer this region without excluding a requested address elsewhere.
  }
  try {
    const response=await fetch(`https://nominatim.openstreetmap.org/search?${params}`,{
      headers:{'User-Agent':'mySex/1.0 (+https://github.com/zhengzihao2002/mySex)',Accept:'application/json'},
      signal:AbortSignal.timeout(5000),cache:'force-cache',next:{revalidate:86400},
    });
    if (!response.ok) return {error:response.status===429?'busy':'unavailable'};
    const data:unknown=await response.json();
    if(!Array.isArray(data))return {error:'unavailable'};
    const places=parseAddressResults(data,lang);
    if(center){
      const rad=(v:number)=>v*Math.PI/180;
      const distance=(p:AddressPlace)=>Math.sin(rad(p.latitude-center.latitude)/2)**2+Math.cos(rad(center.latitude))*Math.cos(rad(p.latitude))*Math.sin(rad(p.longitude-center.longitude)/2)**2;
      places.sort((a,b)=>distance(a)-distance(b));
    }
    return {places};
  } catch {return {error:'unavailable'};}
}
