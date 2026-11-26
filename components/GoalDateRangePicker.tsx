'use client';
import {useState} from 'react';
import {ChevronLeft,ChevronRight,CalendarDays} from 'lucide-react';
import {goalDates} from '@/lib/goal-schedule';
import type {MissionGoal} from '@/lib/partner-mission-rules';
import {GoalNumberInput} from './GoalNumberInput';
import {useT} from './I18nProvider';

export type MinutesPlanMode='total'|'uniform'|'custom';
export const minutesPlanMode=(goal:MissionGoal):MinutesPlanMode=>goal.dailyTargets?'custom':goal.perDay!==undefined?'uniform':'total';
/** Minutes a goal plans for one date: its own amount, else the shared daily amount. */
export const plannedMinutes=(goal:MissionGoal,date:string)=>goal.dailyTargets?.[date]??goal.perDay??0;
export function plannedTotal(goal:MissionGoal,dates:string[]){
 return minutesPlanMode(goal)==='total'?goal.target:dates.reduce((sum,date)=>sum+plannedMinutes(goal,date),0);
}
export const localGoalDates=(startsAt:string,endsAt:string)=>goalDates(startsAt,endsAt,Intl.DateTimeFormat().resolvedOptions().timeZone);

const pad=(n:number)=>String(n).padStart(2,'0');
const key=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const shift=(day:string,delta:number)=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+delta);return key(d);};
// i18n:begin
const MODES:Array<{mode:MinutesPlanMode;label:string;hint:string}>=[
 {mode:'total',label:'Whole period',hint:'One total for all the selected dates.'},
 {mode:'uniform',label:'Same each day',hint:'One amount, applied to every selected date.'},
 {mode:'custom',label:'Each day',hint:'Tap a date in the calendar to set its own minutes.'},
];
// i18n:end

export function GoalDateRangePicker({startsAt,endsAt,onChange,plans=[],onPlanChange}:{startsAt:string;endsAt:string;onChange:(start:string,end:string)=>void;plans?:Array<{label:string;goal:MissionGoal}>;onPlanChange?:(index:number,patch:Partial<MissionGoal>)=>void}){
 const {t,lang}=useT(),[month,setMonth]=useState(startsAt.slice(0,7)),[choosingEnd,setChoosingEnd]=useState(false),[locked,setLocked]=useState(false),[selected,setSelected]=useState(''),[planIndex,setPlanIndex]=useState(0);
 const start=startsAt.slice(0,10),end=shift(endsAt.slice(0,10),-1);
 const [year,m]=month.split('-').map(Number),days=new Date(year,m,0).getDate(),offset=new Date(year,m-1,1).getDay();
 const today=new Date(),min=key(today),max=key(new Date(today.getFullYear(),today.getMonth(),today.getDate()+365));
 const chosen=selected>=start&&selected<=end?selected:start,activeIndex=Math.min(planIndex,Math.max(0,plans.length-1)),plan=plans[activeIndex]?.goal;
 const mode=plan?minutesPlanMode(plan):'total';
 const dates=localGoalDates(startsAt,endsAt);
 const total=plan?plannedTotal(plan,dates):0;
 const editingDays=mode==='custom'&&locked;
 const showMinutes=!!plan&&mode!=='total'&&!choosingEnd;
 const format=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(date+'T12:00:00').toLocaleDateString(lang==='zh'?'zh-CN':'en-US',options);
 const move=(delta:number)=>{const d=new Date(year,m-1+delta,1);const next=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;setMonth(next);if(locked)setSelected(next+'-01'<start?start:next+'-01');};
 const choose=(day:string)=>{if(locked){setSelected(day);return;}if(!choosingEnd){onChange(day+'T00:00',shift(day,1)+'T00:00');setChoosingEnd(true);}else{const first=day<start?day:start,last=day<start?start:day;onChange(first+'T00:00',shift(last,1)+'T00:00');setChoosingEnd(false);setLocked(true);setSelected(day);}};
 const switchMode=(next:MinutesPlanMode)=>{
  if(!plan||next===mode)return;
  const daily=Math.min(1440,Math.max(1,Math.round(total/Math.max(1,dates.length))));
  if(next==='total')onPlanChange?.(activeIndex,{target:Math.max(1,Math.round(total)),perDay:undefined,dailyTargets:undefined});
  else if(next==='uniform')onPlanChange?.(activeIndex,{perDay:mode==='total'?daily:(plan.perDay??daily),dailyTargets:undefined});
  else{
   const perDay=mode==='total'?daily:(plan.perDay??daily);
   onPlanChange?.(activeIndex,{perDay,dailyTargets:Object.fromEntries(dates.map(date=>[date,mode==='total'?perDay:plannedMinutes(plan,date)]))});
   // Editing single dates needs the range held still; Change dates unlocks it.
   setChoosingEnd(false);setLocked(true);
  }
 };
 const hint=choosingEnd?t('Now tap the end date.'):!locked?t('Tap a start date, then an end date. Both dates are included.'):editingDays?t('Tap a selected date to set its minutes.'):t('Dates set. Tap Change dates to choose again.');
 return <section className="rounded-2xl border border-line bg-bg/30 p-3" aria-label={t('Goal date range')}>
  <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16}/>{t('Choose the goal dates')}{locked&&<button type="button" className="ml-auto min-h-11 px-1 text-xs font-normal text-rose-2" onClick={()=>{setLocked(false);setChoosingEnd(false);}}>{t('Change dates')}</button>}</div>
  <div className="mb-3 grid grid-cols-2 gap-2 text-xs"><div className={`rounded-xl border p-2 ${!locked&&!choosingEnd?'border-rose/50':'border-line'}`}><p className="text-ink-3">{t('Start date')}</p><b>{format(start,{month:'short',day:'numeric',year:'numeric'})}</b></div><div className={`rounded-xl border p-2 ${choosingEnd?'border-rose/50':'border-line'}`}><p className="text-ink-3">{t('End date')}</p><b>{format(end,{month:'short',day:'numeric',year:'numeric'})}</b></div></div>
  <div className="mb-2 flex items-center justify-between"><button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 disabled:opacity-30" aria-label={t('Previous month')} disabled={month<=(locked?start.slice(0,7):min.slice(0,7))} onClick={()=>move(-1)}><ChevronLeft size={16}/></button><b className="text-sm">{format(month+'-01',{month:'long',year:'numeric'})}</b><button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 disabled:opacity-30" aria-label={t('Next month')} disabled={month>=(locked?end.slice(0,7):max.slice(0,7))} onClick={()=>move(1)}><ChevronRight size={16}/></button></div>
  <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink-3">{(lang==='zh'?['日','一','二','三','四','五','六']:['S','M','T','W','T','F','S']).map((d,i)=><span key={i} className="py-1">{d}</span>)}</div>
  <div className="grid grid-cols-7 gap-1">{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const date=`${month}-${pad(i+1)}`,edge=date===start||date===end,inside=date>=start&&date<=end;return <button type="button" key={date} disabled={date<min||date>max||(locked&&!inside)} aria-label={format(date,{month:'long',day:'numeric',year:'numeric'})} aria-pressed={inside} onClick={()=>choose(date)} className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl text-sm tabular-nums disabled:opacity-25 ${editingDays&&date===chosen?'ring-2 ring-rose-2 ring-offset-1 ring-offset-bg ':''}${edge?'bg-rose text-white':inside?'bg-rose/15 text-rose-2':'bg-surface-2/60 text-ink-2'}`}><span>{i+1}</span>{showMinutes&&inside&&<span className="text-[9px] leading-tight">{plannedMinutes(plan!,date)}</span>}</button>;})}</div>
  <p className="mt-3 text-xs text-rose-2" aria-live="polite">{hint}</p>
  {plan&&<div className="mt-3 space-y-3 rounded-xl border border-line bg-bg/30 p-3">
   <p className="text-sm font-semibold">{t('Minutes plan')}</p>
   {plans.length>1&&<label className="label">{t('Plan for')}<select className="input mt-1" value={activeIndex} onChange={e=>setPlanIndex(Number(e.target.value))}>{plans.map((p,i)=><option key={i} value={i}>{p.label}</option>)}</select></label>}
   <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg/40 p-1" role="radiogroup" aria-label={t('Minutes plan')}>
    {MODES.map(option=><button key={option.mode} type="button" role="radio" aria-checked={mode===option.mode} onClick={()=>switchMode(option.mode)} className={`min-h-11 rounded-lg px-1 text-xs leading-tight ${mode===option.mode?'bg-rose/15 font-semibold text-rose-2':'text-ink-3'}`}>{t(option.label)}</button>)}
   </div>
   <p className="text-xs leading-relaxed text-ink-3">{t(MODES.find(option=>option.mode===mode)!.hint)}</p>
   {mode==='total'&&<label className="label">{t('Total minutes')}<GoalNumberInput key={'total:'+activeIndex} className="input mt-2" aria-label={t('Total minutes')} required min="1" max="1000000" step="1" value={plan.target} onValueChange={value=>onPlanChange?.(activeIndex,{target:value})}/></label>}
   {mode==='uniform'&&<label className="label">{t('Minutes each day')}<GoalNumberInput key={'uniform:'+activeIndex} className="input mt-2" aria-label={t('Minutes each day')} required min="1" max="1440" step="1" value={plan.perDay??1} onValueChange={value=>onPlanChange?.(activeIndex,{perDay:value})}/></label>}
   {mode==='custom'&&(editingDays?<div className="space-y-2">
    <label className="label">{format(chosen,{month:'long',day:'numeric'})} · {t('Minutes for this day')}<GoalNumberInput key={chosen+':'+activeIndex} className="input mt-2" aria-label={t('Minutes for this day')} required min="0" max="1440" step="1" value={plannedMinutes(plan,chosen)} onValueChange={value=>onPlanChange?.(activeIndex,{dailyTargets:{...plan.dailyTargets,[chosen]:value}})}/></label>
    <button type="button" className="chip w-full text-xs" onClick={()=>{const value=plannedMinutes(plan,chosen);onPlanChange?.(activeIndex,{perDay:Math.max(1,value),dailyTargets:Object.fromEntries(dates.map(date=>[date,value]))});}}>{t('Use {n} min for every day',{n:plannedMinutes(plan,chosen)})}</button>
   </div>:<p className="text-xs text-rose-2">{t('Finish choosing dates, then tap a date to edit its minutes.')}</p>)}
   <p className="text-sm font-semibold text-rose-2">{mode==='uniform'?t('{minutes} min/day × {days} days = {total} min total',{minutes:plan.perDay??0,days:dates.length,total}):t('{days} days · {total} minutes total',{days:dates.length,total})}</p>
   {mode!=='total'&&<p className="text-xs leading-relaxed text-ink-3">{t('These daily amounts add up to one goal. Progress can be spread across the selected period.')}</p>}
  </div>}
 </section>;
}
