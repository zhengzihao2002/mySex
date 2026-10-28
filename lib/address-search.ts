import type {NeonQueryFunction} from '@neondatabase/serverless';
import {claimGeocodingSlot} from './gps-area.ts';

export type AddressPlace = {label: string; latitude: number; longitude: number};
export function parseAddressResults(value: unknown): AddressPlace[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row: unknown): AddressPlace[] => {
    if (!row || typeof row !== 'object') return [];
    const r=row as Record<string,unknown>;
    if (typeof r.display_name !== 'string' || !r.display_name.trim()) return [];
    const number=(v:unknown)=>typeof v==='number'||(typeof v==='string'&&v.trim())?Number(v):NaN;
    const latitude=number(r.lat),longitude=number(r.lon);
    if (!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>85||Math.abs(longitude)>180) return [];
    return [{label:r.display_name.trim().slice(0,500),latitude,longitude}];
  }).slice(0,5);
}

/** Explicit submitted searches only: no keystroke autocomplete or stored search history. */
export async function searchAddresses(client:NeonQueryFunction<false,false>,query:string,lang:'en'|'zh'):
Promise<{places:AddressPlace[]}|{error:'invalid'|'busy'|'unavailable'}> {
  const q=query.trim();
  if (q.length<3||q.length>200) return {error:'invalid'};
  if (!await claimGeocodingSlot(client)) return {error:'busy'};
  const params=new URLSearchParams({q,format:'jsonv2',limit:'5','accept-language':lang});
  try {
    const response=await fetch(`https://nominatim.openstreetmap.org/search?${params}`,{
      headers:{'User-Agent':'mySex/1.0 (+https://github.com/zhengzihao2002/mySex)',Accept:'application/json'},
      signal:AbortSignal.timeout(5000),cache:'force-cache',next:{revalidate:86400},
    });
    if (!response.ok) return {error:response.status===429?'busy':'unavailable'};
    const data:unknown=await response.json();
    return Array.isArray(data)?{places:parseAddressResults(data)}:{error:'unavailable'};
  } catch {return {error:'unavailable'};}
}
