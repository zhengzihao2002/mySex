'use client';

import {useState} from 'react';
import {answerPartnerItemAsk, askPartnerForItem, dismissPartnerItemAsk} from '@/app/partner-mission-actions';
import type {ItemAsk} from '@/lib/partner-item-asks';
import {REWARD_CATALOG,rewardLabel} from '@/lib/reward-catalog';
import {FormError} from './FormError';
import {useT} from './I18nProvider';
import {Sheet} from './Sheet';
import {useRun} from './useRun';

export function PartnerItemAsk(){
  const {t}=useT();
  const [open,setOpen]=useState(false);
  return <>
    <button type="button" className="btn-ghost w-full" onClick={()=>setOpen(true)}>{t('Ask for an item')}</button>
    <Sheet open={open} onClose={()=>setOpen(false)} title={t('Ask for an item')}>
      {open&&<AskForm onDone={()=>setOpen(false)}/>}
    </Sheet>
  </>;
}

function AskForm({onDone}:{onDone:()=>void}){
  const {t}=useT();
  const action=useRun();
  const [choice,setChoice]=useState('');
  const [title,setTitle]=useState('');
  const [amount,setAmount]=useState('');
  const [currency,setCurrency]=useState('USD');
  const [reason,setReason]=useState('');
  return <form className="space-y-4" onSubmit={async e=>{
    e.preventDefault();
    const ok=await action.run(()=>askPartnerForItem({catalogKey:choice,title,reason,
      ...(choice==='contribution'?{amount:Number(amount),currency}:{})}));
    if(ok)onDone();
  }}>
    <label className="label">{t('Item name')}
      <select className="input mt-1 normal-case" required value={choice} onChange={e=>setChoice(e.target.value)}>
        <option value="" disabled>{t('Choose an item to request')}</option>
        {REWARD_CATALOG.filter(([key])=>key!=='nothing').map(([key,name])=><option key={key} value={key}>{t(name)}</option>)}
      </select>
    </label>
    {choice==='custom'&&<label className="label">{t('Name your item')}<input className="input mt-1 normal-case" required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label>}
    {choice==='contribution'&&<div className="grid grid-cols-2 gap-2">
      <label className="label">{t('Amount')}<input className="input mt-1" type="number" required min="0.01" max="1000000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <label className="label">{t('Currency')}<select className="input mt-1" value={currency} onChange={e=>setCurrency(e.target.value)}>{['USD','CNY','EUR','GBP'].map(code=><option key={code}>{code}</option>)}</select></label>
    </div>}
    <label className="label">{t('Why are you asking?')}<textarea className="input mt-1 min-h-24 normal-case" required maxLength={600} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <FormError error={action.error}/>
    <button className="btn-primary w-full" disabled={action.pending||!reason.trim()}>{t('Send request')}</button>
  </form>;
}

export function PartnerItemAskCard({item,outgoing}:{item:ItemAsk;outgoing:boolean}){
  const {t}=useT();
  const action=useRun();
  const [restrictions,setRestrictions]=useState('');
  return <article className="card space-y-3">
    <h3 className="break-words font-semibold">{rewardLabel(item.title,t)}</h3>
    <p className="whitespace-pre-wrap break-words text-sm text-ink-2">{item.reason}</p>
    {outgoing?<><p className="text-xs text-ink-3">{item.decision==='approved'?t('Approved · Added to Storage'):item.decision==='declined'?t('Request declined'):t('Waiting for your partner')}</p>
      <button className="btn-ghost w-full" disabled={action.pending} onClick={()=>action.run(()=>dismissPartnerItemAsk(item.id))}>{item.decision?t('Dismiss'):t('Withdraw request')}</button>
    </>:<>
      <label className="label">{t('Restrictions (optional)')}<textarea className="input mt-1 normal-case" maxLength={600} value={restrictions} onChange={e=>setRestrictions(e.target.value)}/></label>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" disabled={action.pending} onClick={()=>action.run(()=>answerPartnerItemAsk(item.id,'declined',''))}>{t('Decline')}</button>
        <button className="btn-primary" disabled={action.pending} onClick={()=>action.run(()=>answerPartnerItemAsk(item.id,'approved',restrictions))}>{t('Approve item')}</button>
      </div>
    </>}
    <FormError error={action.error}/>
  </article>;
}
