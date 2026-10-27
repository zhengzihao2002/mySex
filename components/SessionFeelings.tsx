'use client';
import {useEffect,useState} from 'react';
import {getSessionFeelings,saveSessionFeeling} from '@/app/actions';
import type {SessionFeeling} from '@/lib/session-feelings';
import {useT} from './I18nProvider';
import {useRun} from './useRun';
import {FormError} from './FormError';
export function SessionFeelings({sessionId}:{sessionId:string}){
 const {t}=useT();const {run,pending,error}=useRun();const [reviews,setReviews]=useState<SessionFeeling[]>([]);const [ready,setReady]=useState(false);const [feeling,setFeeling]=useState('');const [rating,setRating]=useState<number|null>(null);const [highlight,setHighlight]=useState('');const [repeatChoice,setRepeat]=useState<'yes'|'maybe'|'no'|null>(null);const [me,setMe]=useState('');const [saved,setSaved]=useState(false);const [loadError,setLoadError]=useState(false);
 useEffect(()=>{let active=true;getSessionFeelings(sessionId).then(data=>{if(!active)return;setMe(data.meId);setReviews(data.reviews);const own=data.reviews.find(r=>r.userId===data.meId);setFeeling(own?.feeling??'');setRating(own?.rating??null);setHighlight(own?.highlight??'');setRepeat(own?.repeatChoice??null);setReady(true)}).catch(()=>{if(active)setLoadError(true)});return()=>{active=false}},[sessionId]);
 if(loadError)return <p className="text-sm text-rose-2">{t('Could not load session feelings. Reopen this session to try again.')}</p>;
 if(!ready)return <p className="text-xs text-ink-3">{t('Loading session feelings…')}</p>;
 return <section className="my-4 space-y-3 rounded-2xl border border-line p-3">
 <h3 className="font-semibold">{t('Each partner’s experience')}</h3><p className="text-xs text-ink-3">{t('Shared with your partner. Each person can edit only their own feelings, rating and highlights.')}</p>
 {reviews.filter(r=>r.userId!==me).map(r=><div className="rounded-xl bg-surface-2 p-3 text-sm" key={r.userId}><b>{r.name}</b><p className="whitespace-pre-wrap break-words">{r.feeling}</p>{r.rating!=null&&<p>{t('Their personal rating')}: {r.rating}/5</p>}<p className="whitespace-pre-wrap break-words">{r.highlight}</p>{r.repeatChoice&&<p>{t('Would enjoy repeating')}: {t(r.repeatChoice==='yes'?'Yes':r.repeatChoice==='maybe'?'Maybe':'No')}</p>}</div>)}
 <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setSaved(false);if(await run(()=>saveSessionFeeling(sessionId,{feeling,rating,highlight,repeatChoice})))setSaved(true)}}>
 <label className="block text-sm">{t('How did the session feel for you?')}<textarea className="input mt-1" value={feeling} maxLength={200} onChange={e=>setFeeling(e.target.value)}/></label>
 <label className="block text-sm">{t('Your personal rating')}<select className="input mt-1" value={rating??''} onChange={e=>setRating(e.target.value?Number(e.target.value):null)}><option value="">{t('Not recorded')}</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</select></label>
 <label className="block text-sm">{t('Your favourite moment during the session')}<textarea className="input mt-1" maxLength={500} value={highlight} onChange={e=>setHighlight(e.target.value)}/></label>
 <label className="block text-sm">{t('Would enjoy repeating')}<select className="input mt-1" value={repeatChoice??''} onChange={e=>setRepeat((e.target.value||null) as typeof repeatChoice)}><option value="">{t('Not recorded')}</option><option value="yes">{t('Yes')}</option><option value="maybe">{t('Maybe')}</option><option value="no">{t('No')}</option></select></label>
 <FormError error={error}/><button className="btn-ghost w-full" disabled={pending}>{saved?t('Saved ✓'):t('Save my experience')}</button>
 </form></section>;
}
