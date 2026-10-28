'use client';

import {useId,useState} from 'react';
import type {Score} from '@/lib/score';
import type {SexSession} from '@/lib/types';
import {useT} from './I18nProvider';
import {scoreColor} from './ScoreBadge';

const COLORS=['#ff4389','#c879f4','#7c8dff','#ffb34d','#43cebd','#e992b6'];
const R=66,C=2*Math.PI*R;

/** Each coloured arc contributes its points out of 100, leaving unearned points muted. */
export function SessionScore({score,session:s}:{score:Score;session:SexSession}) {
  const {t,f}=useT();
  const [selected,setSelected]=useState<string|null>(null);
  const [expanded,setExpanded]=useState(false);
  const choose=(key:string)=>{setExpanded(true);setSelected(selected===key?null:key);};
  const detailId=useId();
  const part=score.parts.find(p=>p.key===selected);
  let offset=0;
  const explanations:Record<string,string>={
    duration:t('Active time adds up to 40 points with diminishing returns: 40 × (1 − e^(−minutes / 15)), rounded.'),
    her:t('First orgasm: 12 points. Each additional orgasm: 4 points, up to 20.'),
    his:t('First orgasm: 6 points. Each additional orgasm: 2 points, up to 8.'),
    heat:t('The average partner heat rating is multiplied by 3, up to 15 points.'),
    variety:t('Each recorded tag adds 2 points, up to 8.'),
    adventure:t('3 points each for a new location, an adventurous activity, and a second or later session that day.'),
  };
  const input=part?.key==='duration'?f.formatDuration(s.durationSec??0):part?.key==='her'?`${s.herOrgasms??0} · ${t('Her orgasms 💦')}`:part?.key==='his'?`${s.hisOrgasms??0} · ${t('His orgasms 🍆')}`:part?.key==='heat'?`${s.rating??'–'}/5`:part?.key==='variety'?s.tags.map(x=>t(x)).join(' · ')||t('None'):null;
  return <section className="mb-4 rounded-3xl border border-line bg-gradient-to-br from-surface-2 to-surface p-4" aria-label={t('Score breakdown')}>
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{t('mySex Score')}</h3><span className="text-xs text-ink-3">{t('Saved score')}</span></div>
    <div className="relative mx-auto my-2 h-44 w-44">
      <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90" aria-label={t('Score breakdown')}>
        <circle cx="88" cy="88" r={R} fill="none" stroke="var(--color-line)" strokeWidth="14"/>
        {score.parts.map((p,i)=>{
          const start=offset;offset+=p.points;
          return p.points>0?<circle key={p.key} cx="88" cy="88" r={R} fill="none" stroke={COLORS[i%COLORS.length]}
            strokeWidth={selected===p.key?19:14} strokeDasharray={`${Math.max(0,p.points-0.7)/100*C} ${C}`} strokeDashoffset={-start/100*C}
            role="button" tabIndex={0} aria-label={`${t(p.label)}: ${p.points}%`} aria-pressed={selected===p.key} aria-controls={detailId}
            className="cursor-pointer transition-all duration-200 motion-reduce:transition-none" style={{opacity:selected&&selected!==p.key?0.3:1}}
            onClick={()=>choose(p.key)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(p.key);}}}/>:null;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" role="meter" aria-label={t('Saved score')} aria-valuenow={score.total} aria-valuemin={0} aria-valuemax={100}><span className="text-5xl font-bold tabular-nums" style={{color:scoreColor(score.total)}}>{score.total}<span className="text-lg">%</span></span><span className="mt-1 text-xs text-ink-2">{score.emoji} {t(score.grade)}</span></div>
    </div>
    <button type="button" className="btn-ghost w-full" aria-expanded={expanded} aria-controls={detailId} onClick={()=>{setExpanded(!expanded);if(expanded)setSelected(null);}}>{expanded?t('Hide score breakdown'):t('How is this calculated?')}</button>
    {expanded&&<div className="mt-3 space-y-3">
    <div className="grid grid-cols-2 gap-2">
      {score.parts.map((p,i)=><button type="button" key={p.key} aria-pressed={selected===p.key} aria-controls={detailId} onClick={()=>choose(p.key)}
        className={`flex min-h-11 items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-colors ${selected===p.key?'border-rose bg-rose/10':'border-line bg-surface/40'}`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}}/><span className="flex-1">{t(p.label)}</span><b className="tabular-nums">{p.points}%</b>
      </button>)}
    </div>
    <div id={detailId} className="mt-3 rounded-2xl bg-surface/60 p-3 text-xs text-ink-2" aria-live="polite">
      {part?<><p className="mb-1 font-semibold text-ink">{t(part.label)} · +{part.points}% <span className="font-normal text-ink-3">{t('Maximum {n}%',{n:part.max})}</span></p>
        {input&&<p className="mb-1">{input}</p>}<p>{explanations[part.key]}</p>
        {part.key==='adventure'&&score.context&&<ul className="mt-2 space-y-1">
          {[[t('New location'),score.context.newPlace],[t('Adventurous activity'),score.context.adventurousActivity],[t('Second or later round'),score.context.roundOfDay>=2]].map(([label,earned])=><li key={String(label)} className="flex justify-between gap-2"><span>{label}</span><b>{earned?'+3%':'0%'}</b></li>)}
        </ul>}
      </>:<p>{t('Tap a segment or category to see how it is calculated.')}</p>}
    </div>
    <p className="text-center text-xs text-ink-3">{t('Contributions add up to {n}%.',{n:score.total})}</p>
    </div>}
    <p className="mt-2 text-center text-xs text-ink-3">{t('Read-only · calculated from saved details')}</p>
  </section>;
}
