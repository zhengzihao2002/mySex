'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {useT} from './I18nProvider';
const destination=(path:string)=>path==='/home'?'Home':path==='/inbox'?'Inbox':path==='/storage'?'Storage':path==='/missions/partner'?'Partner goals':path==='/missions'?'Couple quests':path==='/calendar'?'Calendar':path==='/insights'?'Insights':path==='/play'?'Play':path==='/settings'?'Settings':path==='/notes'?'Notes':path==='/timer'?'Timer':'Previous screen';
export function MissionBack(){
 const router=useRouter(),{t}=useT(),[from,setFrom]=useState('/home');
 useEffect(()=>{if(typeof history.state?.mysexOrigin==='string')setFrom(history.state.mysexOrigin);},[]);
 return <button type="button" className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-3" onClick={()=>{if(from.startsWith('/')&&!from.startsWith('//')&&history.state?.mysexOrigin&&history.length>1)router.back();else router.push('/home');}}><ArrowLeft size={15}/>{t(destination(from))}</button>;
}
