'use client';

import Link from 'next/link';
import {PartnerItemAsk} from './PartnerItemAsk';
import {rewardLabel} from '@/lib/reward-catalog';
import {MissionBack} from './MissionBack';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,Check,ChevronRight,Clock3,Gift,PackageOpen,ShieldCheck,Sparkles} from 'lucide-react';
import {motion} from 'motion/react';
import {giveUpStorageItem,requestStorageItem,respondStorageItem,withdrawStorageItem} from '@/app/partner-mission-actions';
import type {StorageItem} from '@/lib/partner-mission-store';
import {useT} from './I18nProvider';
import {useRun} from './useRun';
import {Sheet} from './Sheet';
import {FormError} from './FormError';
import {RewardToken} from './RewardToken';

export function PartnerStorage({items,meId,partnerName}:{items:StorageItem[];meId:string;partnerName:string}){
  const {t}=useT(),router=useRouter();
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const selected=items.find(item=>item.id===selectedId&&item.ownerId===meId)??null;
  const mine=items.filter(item=>item.ownerId===meId&&(item.status==='ready'||item.status==='requested'));
  const approvals=items.filter(item=>item.issuerId===meId&&item.ownerId!==meId&&item.status==='requested');
  const used=items.filter(item=>item.ownerId===meId&&item.status==='used');
  const waiting=mine.filter(item=>item.status==='requested');
  const displayed=mine;
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&!document.querySelector('[role="dialog"],dialog[open]'))router.refresh();};const id=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{clearInterval(id);window.removeEventListener('focus',refresh);};},[router]);
  return <div className="space-y-5 pt-2 pb-4">
    <header><MissionBack/><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="eyebrow mb-1 text-luteal">{t('Collected, not forgotten')}</p><h1 className="font-display text-3xl font-bold">{t('Storage')}</h1></div><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-luteal/20 bg-luteal/10 text-luteal"><PackageOpen size={25} strokeWidth={1.5}/></span></div></header>
    <section className="relative isolate overflow-hidden rounded-[28px] border border-luteal/20 bg-gradient-to-br from-luteal/10 via-surface to-plum/15 p-5"><Sparkles aria-hidden="true" size={82} strokeWidth={.7} className="pointer-events-none absolute -right-1 -top-3 rotate-12 text-luteal/10"/><h2 className="relative font-display text-2xl">{t('Little treasures. Real agreements.')}</h2><p className="relative mt-2 max-w-sm text-sm leading-relaxed text-ink-2">{t('Every item has a story. Choose one, ask your partner, and make a new moment together.')}</p><div className="mt-5 grid grid-cols-2 divide-x divide-line border-t border-line/60 pt-4 text-center"><div><b className="text-2xl tabular-nums text-luteal">{mine.filter(i=>i.status==='ready').length}</b><p className="mt-1 text-[10px] text-ink-3">{t('Ready to ask')}</p></div><div><b className="text-2xl tabular-nums">{waiting.length}</b><p className="mt-1 text-[10px] text-ink-3">{t('Waiting')}</p></div></div></section>
    <PartnerItemAsk/>
    {approvals.length>0&&<Link href="/inbox" className="btn-ghost w-full">{t('Review item requests in Inbox')} · {approvals.length}</Link>}
    {displayed.length===0?<div className="rounded-3xl border border-dashed border-line px-5 py-10 text-center"><PackageOpen size={34} strokeWidth={1.2} className="mx-auto mb-3 text-ink-3"/><h2 className="font-display text-xl">{t('Room for your first surprise.')}</h2><p className="mt-2 text-sm leading-relaxed text-ink-3">{t('Prizes and return claims arrive here when a joined goal earns them.')}</p>{<Link href="/missions/partner" className="chip mt-4">{t('Explore partner goals')}<ChevronRight size={14}/></Link>}</div>:<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{displayed.map(item=><motion.button layout key={item.id} type="button" onClick={()=>setSelectedId(item.id)} whileTap={{scale:.985}} className="relative overflow-hidden rounded-[26px] border border-line bg-surface p-4 text-left"><div className="flex items-start justify-between gap-3"><RewardToken icon={item.icon}/><span className={`rounded-full border px-2.5 py-1 text-[10px] ${item.status==='requested'?'border-rose/20 bg-rose/10 text-rose-2':'border-luteal/20 bg-luteal/5 text-luteal'}`}>{item.status==='requested'?(item.ownerId===meId?t('Approval requested'):t('Needs your agreement')):t('Ready')}</span></div><p className="mb-1 mt-4 text-[10px] text-ink-3">{item.kind==='bonus'?t('Stretch prize'):item.kind==='claim'?t('Return claim'):item.kind==='ask'?t('Item request'):t('Goal prize')}</p><h2 className="break-words font-display text-xl">{rewardLabel(item.title,t)}{(item.quantityRemaining??1)>1&&` ×${item.quantityRemaining}`}</h2><p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-2">{item.details||t('A little something, made just for you.')}</p><div className="mt-4 flex items-center gap-2 border-t border-line/60 pt-3 text-xs text-ink-3"><span className="min-w-0 flex-1 truncate">{t(item.missionTitle==='Partner mission'?'Partner goal':item.missionTitle)}</span><ChevronRight size={15}/></div></motion.button>)}</div>}
    <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-3"><ShieldCheck size={15} className="mt-0.5 shrink-0"/>{t('A new agreement each time. Either partner can say no.')}</p>
    {used.length>0&&<details className="rounded-2xl border border-line bg-surface/50 p-4"><summary className="cursor-pointer text-sm text-ink-2">{t('Shared moments')} · {used.length}</summary><div className="mt-3 space-y-3">{used.map(item=><div key={item.id} className="flex items-center gap-3"><RewardToken small icon={item.icon}/><div className="min-w-0 flex-1"><p className="break-words text-sm">{rewardLabel(item.title,t)}</p><p className="truncate text-xs text-ink-3">{t(item.missionTitle==='Partner mission'?'Partner goal':item.missionTitle)}</p></div><Check size={16} className="text-follicular"/></div>)}</div></details>}
    <Sheet open={!!selected} onClose={()=>setSelectedId(null)} title={t('Your item')}>{selected&&<ItemDetails key={`${selected.id}:${selected.status}`} item={selected} meId={meId} partnerName={partnerName} onDone={()=>setSelectedId(null)}/>}</Sheet>
  </div>;
}

export function ItemDetails({item,meId,partnerName,onDone}:{item:StorageItem;meId:string;partnerName:string;onDone:()=>void}){
  const {t,lang}=useT(),action=useRun();const mine=item.ownerId===meId;
  const [confirmGiveUp,setConfirmGiveUp]=useState(false);
  return <div className="space-y-5"><div className="rounded-3xl border border-line bg-gradient-to-br from-plum/20 to-bg/30 p-5"><RewardToken icon={item.icon}/><p className="mt-4 text-xs text-luteal">{item.kind==='bonus'?t('Stretch prize'):item.kind==='claim'?t('Return claim'):item.kind==='ask'?t('Item request'):t('Goal prize')}</p><h2 className="mt-1 break-words font-display text-3xl">{rewardLabel(item.title,t)}{(item.quantityRemaining??1)>1&&` ×${item.quantityRemaining}`}</h2>{item.details&&<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{item.details}</p>}<p className="mt-4 border-t border-line/70 pt-3 text-xs text-ink-3">{item.kind==='ask'?t('Granted by {name}',{name:partnerName}):`${t('Earned from')}: ${t(item.missionTitle==='Partner mission'?'Partner goal':item.missionTitle)}`}</p><p className="mt-1 text-xs text-ink-3">{new Date(item.createdAt).toLocaleDateString(lang==='zh'?'zh-CN':'en',{year:'numeric',month:'long',day:'numeric'})}</p></div>
    <p className="rounded-2xl border border-line bg-bg/30 p-3 text-xs leading-relaxed text-ink-2">{t('A new agreement each time. Either partner can say no.')} {t('Approval uses this item once. It does not change protection settings or trigger any payment or deletion.')}</p>
    {mine&&confirmGiveUp?<div className="space-y-3 rounded-2xl border border-menstrual/30 p-4">
      <p className="font-semibold">{t('Give up this item?')}</p>
      <p className="text-sm text-ink-2">{t('This permanently removes all remaining units and cancels any pending use request.')}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-ghost" disabled={action.pending} onClick={()=>setConfirmGiveUp(false)}>{t('Keep item')}</button>
        <button type="button" className="btn-ghost text-menstrual" disabled={action.pending} onClick={async()=>{if(await action.run(()=>giveUpStorageItem(item.id)))onDone();}}>{t('Give up item')}</button>
      </div>
    </div>:<>
    {mine&&item.status==='ready'&&<button className="btn-primary w-full" disabled={action.pending} onClick={async()=>{if(await action.run(()=>requestStorageItem(item.id)))onDone();}}><Gift size={17}/>{t('Ask {name} to use this',{name:partnerName})}</button>}
    {mine&&item.status==='requested'&&<div><p className="mb-3 flex items-center gap-2 text-sm text-rose-2"><Clock3 size={17}/>{t('Waiting for {name}’s agreement',{name:partnerName})}</p><button className="btn-ghost w-full" disabled={action.pending} onClick={async()=>{if(await action.run(()=>withdrawStorageItem(item.id)))onDone();}}>{t('Withdraw request')}</button></div>}
    {mine&&(item.status==='ready'||item.status==='requested')&&<button type="button" className="btn-ghost w-full text-ink-3" disabled={action.pending} onClick={()=>setConfirmGiveUp(true)}>{t('Voluntarily give up')}</button>}
    </>}
    {!mine&&item.issuerId===meId&&item.status==='requested'&&<div><p className="mb-3 text-sm text-ink-2">{t('{name} would like to use this item. Do you agree?',{name:partnerName})}</p><div className="grid grid-cols-2 gap-2"><button className="btn-ghost" disabled={action.pending} onClick={async()=>{if(await action.run(()=>respondStorageItem(item.id,false,item.requestedAt??undefined)))onDone();}}>{t('Not this time')}</button><button className="btn-primary" disabled={action.pending} onClick={async()=>{if(await action.run(()=>respondStorageItem(item.id,true,item.requestedAt??undefined)))onDone();}}><Check size={16}/>{t('Agree & use item')}</button></div><p className="mt-3 text-xs text-ink-3">{t('If you decline, the item returns to their collection for another time.')}</p></div>}
    <FormError error={action.error}/>
  </div>;
}
