'use client';
import {HeatRating} from './HeatRating';
import {Stepper,type SessionFormValues} from './SessionForm';
import {useT} from './I18nProvider';
export function ExperienceFields({v,set,mode,isHer}:{v:SessionFormValues;set:(p:Partial<SessionFormValues>)=>void;mode:string;isHer:boolean}){
 const {t}=useT();const her=mode!=='edit'||isHer;const his=mode!=='edit'||!isHer;const heat=[v.hisRating,v.herRating].filter((n):n is number=>n!=null);const avg=heat.length?heat.reduce((a,b)=>a+b,0)/heat.length:null;
 return <section className="space-y-4"><h3 className="font-semibold">{t('Each partner’s experience')}</h3>
 <div><p className="label">{t('Her')}</p><HeatRating value={v.herRating} onChange={herRating=>set({herRating})} disabled={!her}/></div>
 <div><p className="label">{t('Him')}</p><HeatRating value={v.hisRating} onChange={hisRating=>set({hisRating})} disabled={!his}/></div>
 <p className="text-xs text-ink-3">{t('Average heat')}: {avg??'–'}/5</p><div className="grid grid-cols-2 gap-3"><Stepper label={t('Her orgasms 💦')} value={v.herOrgasms} onChange={herOrgasms=>set({herOrgasms})} disabled={!her}/><Stepper label={t('His orgasms 🍆')} value={v.hisOrgasms} onChange={hisOrgasms=>set({hisOrgasms})} disabled={!his}/></div>
 <div className="space-y-3"><p className="label">{t('Dirty details')}</p>
 <label className="block text-sm">{t('Her')}<textarea readOnly={!her} className="input mt-1 min-h-20 read-only:opacity-60" placeholder={t('What made it memorable…')} maxLength={1000} value={v.herNotes} onChange={e=>set({herNotes:e.target.value})}/></label>
 <label className="block text-sm">{t('Him')}<textarea readOnly={!his} className="input mt-1 min-h-20 read-only:opacity-60" placeholder={t('What made it memorable…')} maxLength={1000} value={v.hisNotes} onChange={e=>set({hisNotes:e.target.value})}/></label></div></section>;
}
