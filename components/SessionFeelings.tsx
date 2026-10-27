'use client';
import {useEffect,useState} from 'react';
import {getSessionFeelings,saveSessionFeeling} from '@/app/actions';
import type {SessionFeeling} from '@/lib/session-feelings';
import {useT} from './I18nProvider';
import {useRun} from './useRun';
import {FormError} from './FormError';
export function SessionFeelings({sessionId}:{sessionId:string}){
 const {t}=useT();const {run,pending,error}=useRun();const [reviews,setReviews]=useState<SessionFeeling[]>([]);const [ready,setReady]=useState(false);const [note,setNote]=useState('');const [rating,setRating]=useState<number|null>(null);const [orgasms,setOrgasms]=useState<number|null>(null);const [me,setMe]=useState('');const [saved,setSaved]=useState(false);const [loadError,setLoadError]=useState(false);
 useEffect(()=>{let active=true;getSessionFeelings(sessionId).then(data=>{if(!active)return;setMe(data.meId);setReviews(data.reviews);setOrgasms(data.orgasms??null);const own=data.reviews.find(r=>r.userId===data.meId);setNote([own?.feeling,own?.highlight].filter(Boolean).join('\n'));setRating(own?.rating??null);setReady(true)}).catch(()=>{if(active)setLoadError(true)});return()=>{active=false}},[sessionId]);
 if(loadError)return <p className="text-sm text-rose-2">{t('Could not load session feelings. Reopen this session to try again.')}</p>;
 if(!ready)return <p className="text-xs text-ink-3">{t('Loading session feelings…')}</p>;
 return <section className="my-4 space-y-3 rounded-2xl border border-line p-3">
 <h3 className="font-semibold">{t('Each partner’s experience')}</h3><p className="text-xs text-ink-3">{t('Each partner writes one note and gives their own heat rating. The session uses the average of submitted ratings.')}</p>
 {reviews.filter(r=>r.userId!==me).map(r=><div className="rounded-xl bg-surface-2 p-3 text-sm" key={r.userId}><b>{r.name}</b><p className="whitespace-pre-wrap break-words">{[r.feeling,r.highlight].filter(Boolean).join('\n')}</p>{r.rating!=null&&<p>🔥 {r.rating}/5</p>}</div>)}
 <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setSaved(false);if(await run(()=>saveSessionFeeling(sessionId,{feeling:note,rating,orgasms})))setSaved(true)}}>
 <label className="block text-sm">{t('Your session note')}<textarea className="input mt-1" value={note} maxLength={1000} onChange={e=>setNote(e.target.value)}/></label>
 <fieldset><legend className="mb-2 text-sm">{t('How hot was it?')}</legend><div className="flex gap-2">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n}/5`} aria-pressed={rating===n} onClick={()=>setRating(rating===n?null:n)} className={`rounded-xl p-2 text-2xl ${rating!=null&&n<=rating?'bg-rose/20':'opacity-30'}`}>🔥</button>)}</div></fieldset>
 <label className="block text-sm">{t('Your orgasms')}<input type="number" inputMode="numeric" className="input mt-1" min={0} max={20} value={orgasms??''} onChange={e=>setOrgasms(e.target.value===''?null:Number(e.target.value))}/></label>
 <FormError error={error}/><button className="btn-ghost w-full" disabled={pending}>{saved?t('Saved ✓'):t('Save my experience')}</button>
 </form></section>;
}
