'use client';

import {useId,useState} from 'react';
import {Search,X} from 'lucide-react';
import {ACTIVITY_GROUPS,tagsForKind} from '@/lib/activity-details';
import type {SessionKind} from '@/lib/types';
import {useT} from './I18nProvider';

/** Activity-specific choices, grouped for quick scanning and searchable in the current language. */
export function ActivityFields({kind,value,onChange,disabled=false}:{kind:SessionKind;value:string[];onChange:(tags:string[])=>void;disabled?:boolean}){
  const {t}=useT();
  const [searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState('');
  const searchId=useId();
  const known=new Set(tagsForKind(kind));
  const earlier=value.filter(tag=>!known.has(tag));
  const groups=[...ACTIVITY_GROUPS[kind],...(earlier.length?[{key:'earlier',label:'Previously recorded',emoji:'📖',tags:earlier}]:[])];
  const matches=(text:string)=>!query.trim()||`${text} ${t(text)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const filtered=groups.map(group=>({...group,tags:group.tags.filter(tag=>matches(tag)||matches(group.label))})).filter(group=>group.tags.length);
  const toggle=(tag:string)=>onChange(value.includes(tag)?value.filter(v=>v!==tag):value.length<20?[...value,tag]:value);
  return <section className="space-y-3" aria-label={t('What went down')}>
    <div className="flex items-center gap-2"><h3 className="label mb-0 flex-1">{t('What went down')}</h3><span className="text-xs text-ink-3">{t('{n} selected',{n:value.length})}</span>
      <button type="button" disabled={disabled} className="rounded-full bg-surface-2 p-2 text-ink-2" aria-label={t(searchOpen?'Close activity search':'Search activities')} aria-expanded={searchOpen} onClick={()=>{setSearchOpen(!searchOpen);setQuery('');}}>{searchOpen?<X size={15}/>:<Search size={15}/>}</button></div>
    {searchOpen&&<input id={searchId} className="input" aria-label={t('Search activities')} placeholder={t('Find a position, mood, or extra…')} value={query} disabled={disabled} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();}}}/>}
    {filtered.map(group=><fieldset key={group.key} className="rounded-2xl border border-line/60 bg-surface-2/30 p-3" disabled={disabled}>
      <legend className="px-1 text-xs font-semibold text-ink-2">{group.emoji} {t(group.label)}</legend>
      <div className="flex flex-wrap gap-2">{group.tags.map(tag=>{const on=value.includes(tag);return <button type="button" key={tag} data-tag={tag} aria-pressed={on} disabled={!on&&value.length>=20} onClick={()=>toggle(tag)} className={`chip transition-colors disabled:opacity-40 ${on?'chip-on':''}`}>{t(tag)}</button>;})}</div>
    </fieldset>)}
    {!filtered.length&&<p role="status" className="text-sm text-ink-3">{t('No matching activities.')}</p>}
    {value.length>=20&&<p className="text-xs text-ink-3">{t('Up to {n} selections',{n:20})}</p>}
  </section>;
}
