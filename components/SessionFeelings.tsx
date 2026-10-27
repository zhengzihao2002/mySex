'use client';
import {useEffect,useState} from 'react';
import {getSessionFeelings,saveSessionFeeling} from '@/app/actions';
import type {SessionFeeling} from '@/lib/session-feelings';
import {useT} from './I18nProvider';
import {useRun} from './useRun';
import {HeatRating} from './HeatRating';
import {Stepper} from './SessionForm';
import {FormError} from './FormError';
export function SessionFeelings({sessionId}:{sessionId:string}){
 const [isHer,setIsHer]=useState(false);const [partnerOrg,setPartnerOrg]=useState<number|null>(null);
 const {t}=useT();const {run,pending,error}=useRun();const [reviews,setReviews]=useState<SessionFeeling[]>([]);const [ready,setReady]=useState(false);const [note,setNote]=useState('');const [rating,setRating]=useState<number|null>(null);const [orgasms,setOrgasms]=useState<number|null>(null);const [me,setMe]=useState('');const [saved,setSaved]=useState(false);const [loadError,setLoadError]=useState(false);
 useEffect(()=>{let active=true;getSessionFeelings(sessionId).then(data=>{if(!active)return;setMe(data.meId);setIsHer(data.isHer);setPartnerOrg(data.partnerOrgasms??null);setReviews(data.reviews);setOrgasms(data.orgasms??null);const own=data.reviews.find(r=>r.userId===data.meId);setNote([own?.feeling,own?.highlight].filter(Boolean).join('\n'));setRating(own?.rating??null);setReady(true)}).catch(()=>{if(active)setLoadError(true)});return()=>{active=false}},[sessionId]);
 if(loadError)return <p className="text-sm text-rose-2">{t('Could not load session feelings. Reopen this session to try again.')}</p>;
 if(!ready)return <p className="text-xs text-ink-3">{t('Loading session feelings…')}</p>;
 return <section className="my-4 space-y-5">
 <h3 className="font-semibold">{t('Each partner’s experience')}</h3><p className="text-xs text-ink-3">{t('Each partner writes one note and gives their own heat rating. The session uses the average of submitted ratings.')}</p>
 {reviews.filter(r=>r.userId!==me).map(r=><div className="rounded-xl bg-surface-2 p-3 text-sm" key={r.userId}><b>{r.name}</b><p className="whitespace-pre-wrap break-words">{[r.feeling,r.highlight].filter(Boolean).join('\n')}</p>{r.rating!=null&&<p>🔥 {r.rating}/5</p>}</div>)}
 <form className="space-y-5" onSubmit={async e=>{e.preventDefault();setSaved(false);if(await run(()=>saveSessionFeeling(sessionId,{feeling:note,rating,orgasms})))setSaved(true)}}>
 <HeatRating value={rating} onChange={setRating}/>
 <div className="grid grid-cols-2 gap-3"><Stepper label={t('Her orgasms 💦')} value={isHer?orgasms:partnerOrg} onChange={setOrgasms} disabled={!isHer}/><Stepper label={t('His orgasms 🍆')} value={isHer?partnerOrg:orgasms} onChange={setOrgasms} disabled={isHer}/></div>
 <div><label className="label">{t('Dirty details')}</label><textarea className="input min-h-20" maxLength={1000} placeholder={t('What made it memorable…')} value={note} onChange={e=>setNote(e.target.value)}/></div>
 <FormError error={error}/><button className="btn-primary w-full" disabled={pending}>{saved?t('Saved ✓'):t('Save my experience')}</button>
 </form></section>;
}
