'use client';
import {Flame} from 'lucide-react';
import {HEAT} from '@/lib/content';
import {useT} from './I18nProvider';
/** Original session-form heat control, reused for each partner's own rating. */
export function HeatRating({value,onChange}:{value:number|null;onChange:(n:number|null)=>void}){
 const {t}=useT();return <div><label className="label">{t('How hot was it?')}</label><div className="flex items-center gap-1">
 {HEAT.map((h,i)=><button type="button" key={h} onClick={()=>onChange(value===i+1?null:i+1)} className="p-1 transition active:scale-90" aria-label={t(h)} aria-pressed={value===i+1}><Flame size={30} className={value&&i<value?'fill-rose text-rose':'text-line'} strokeWidth={1.5}/></button>)}
 <span className="ml-2 text-sm text-ink-2">{value?t(HEAT[value-1]):''}</span></div></div>;
}
