'use client';
import {useRouter} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {useT} from './I18nProvider';
export function MissionBack(){const router=useRouter(),{t}=useT();return <button type="button" className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-3" onClick={()=>{let from='';try{from=history.state?.mysexOrigin??'';}catch{}if(from.startsWith('/')&&!from.startsWith('//')&&history.length>1)router.back();else router.push('/home');}}><ArrowLeft size={15}/>{t('Back')}</button>;}
