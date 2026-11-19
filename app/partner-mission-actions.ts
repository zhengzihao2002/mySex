'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {requireCouple} from '@/lib/data';
import {db} from '@/lib/db';
import {safeTz} from '@/lib/tz';
import {scheduledGoal} from '@/lib/goal-schedule';
import {createItemAsk,resolveItemAsk,removeItemAsk} from '@/lib/partner-item-asks';
import {REWARD_CATALOG,catalogReward} from '@/lib/reward-catalog';
import {requestGoalEnd,resolveGoalEnd} from '@/lib/partner-goal-end';
import {ACTIVITY_GROUPS, INTERCOURSE_POSITIONS} from '@/lib/activity-details';
import type {ActionResult} from '@/lib/types';
import {insertPartnerMission,decidePartnerMission,changeStorageItem,forfeitStorageItem,type PartnerMissionActor} from '@/lib/partner-mission-store';
const reward=z.object({quantity:z.number().int().min(1).max(999).default(1),amount:z.number().finite().min(0.01).multipleOf(0.01).max(1000000).optional(),currency:z.enum(['USD','CNY','EUR','GBP']).optional(),catalogKey:z.string().max(40).optional(),title:z.string().trim().max(100).default(''),details:z.string().trim().max(600).default(''),icon:z.string().optional()});
const goal=z.object({dailyTargets:z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/),z.number().finite().min(0).max(1440)).optional(),perDay:z.number().finite().positive().max(1440).optional(),kind:z.enum(['intercourse','oral']),metric:z.enum(['active_minutes','total_minutes','sessions','positions']),target:z.number().finite().positive().max(1000000)});
const schema=z.object({outcomesRequired:z.boolean().default(false),dateOnly:z.boolean().default(false),timeZone:z.string().max(80).default('UTC'),goals:z.array(goal).min(1).max(8).optional(),metric:z.enum(['active_minutes','total_minutes','sessions','positions']),target:z.number().finite().positive().max(1000000),startsAt:z.string().datetime(),endsAt:z.string().datetime(),reward:reward.nullable().default(null),bonusMultiplier:z.number().finite().min(2).max(10).nullable().default(null),bonusReward:reward.nullable().default(null),failureClaim:reward.nullable().default(null)}).superRefine((v,ctx)=>{
 if(v.outcomesRequired&&(!v.reward?.catalogKey||!v.failureClaim?.catalogKey))ctx.addIssue({code:'custom',message:'Choose prize and return claim, or Nothing.'});
 const start=Date.parse(v.startsAt),end=Date.parse(v.endsAt),now=Date.now();
 if(start<now-86400000||end<=now||end<=start||end-start>366*86400000)ctx.addIssue({code:'custom',message:'Invalid goal window.'});
 if((v.metric==='sessions'||v.metric==='positions')&&!Number.isInteger(v.target))ctx.addIssue({code:'custom',message:'Use a whole-number target.'});
 if(v.metric==='positions'&&(v.target>INTERCOURSE_POSITIONS.length||v.target*(v.bonusMultiplier??1)>INTERCOURSE_POSITIONS.length))ctx.addIssue({code:'custom',message:'The position target exceeds the recorded position types.'});
 for(const g of v.goals??[]){if((g.perDay!==undefined||g.dailyTargets!==undefined)&&!['active_minutes','total_minutes'].includes(g.metric))ctx.addIssue({code:'custom',message:'Daily targets require minutes.'});if((g.metric==='sessions'||g.metric==='positions')&&!Number.isInteger(g.target))ctx.addIssue({code:'custom',message:'Whole-number target required.'});if(g.metric==='positions'&&g.target*(v.bonusMultiplier??1)>(g.kind==='oral'?ACTIVITY_GROUPS.oral.find(g=>g.key==='positions')!.tags.length:INTERCOURSE_POSITIONS.length))ctx.addIssue({code:'custom',message:'Position target too high.'});}
 for(const r of [v.reward,v.bonusReward,v.failureClaim])if(r&&((r.catalogKey==='contribution'&&!r.amount)||!catalogReward(r).title.trim()))ctx.addIssue({code:'custom',message:'Choose a prize or enter your own.'});
 if(!!(v.bonusReward&&v.bonusReward.catalogKey!=='nothing')!==!!v.bonusMultiplier)ctx.addIssue({code:'custom',message:'Choose both a bonus target and bonus prize.'});
});
const fail=(error:string):ActionResult=>({ok:false,error});
function finish(ok:boolean):ActionResult{if(!ok)return fail(/*i18n*/'This goal or item changed. Refresh and try again.');revalidatePath('/','layout');return {ok:true};}
async function actor():Promise<PartnerMissionActor>{const ctx=await requireCouple();return {coupleId:ctx.couple.id,userId:ctx.me.userId,partnerId:ctx.partner.userId};}
export async function createPartnerMission(input:unknown):Promise<ActionResult>{
 const a=await actor(),parsed=schema.safeParse(input);
 if(!parsed.success)return fail(/*i18n*/'Check the goal conditions, dates and reward details.');
 const d=parsed.data;const timeZone=safeTz(d.timeZone);const goals=d.goals?.map(g=>({...scheduledGoal(g,d.startsAt,d.endsAt,timeZone),dateOnly:d.dateOnly,timeZone}));
 if(goals?.some(g=>!Number.isFinite(g.target)||g.target<=0))return fail('Check the goal conditions, dates and reward details.');
 return finish(await insertPartnerMission(db(),a,{...d,goals,metric:goals?.[0].metric??d.metric,target:goals?.[0].target??d.target,title:'Partner goal',description:'',reward:d.reward&&d.reward.catalogKey!=='nothing'?{...catalogReward(d.reward),quantity:d.reward.quantity}:null,bonusReward:d.bonusReward&&d.bonusReward.catalogKey!=='nothing'?{...catalogReward(d.bonusReward),quantity:d.bonusReward.quantity}:null,failureClaim:d.failureClaim&&d.failureClaim.catalogKey!=='nothing'?{...catalogReward(d.failureClaim),quantity:d.failureClaim.quantity}:null}));
}
export async function respondPartnerMission(id:string,decision:'accept'|'decline'|'cancel'):Promise<ActionResult>{
 const a=await actor();if(!z.string().uuid().safeParse(id).success||!['accept','decline','cancel'].includes(decision))return fail(/*i18n*/'Invalid goal.');
 return finish(await decidePartnerMission(db(),a,id,decision));
}
export async function requestStorageItem(id:string):Promise<ActionResult>{const a=await actor();if(!z.string().uuid().safeParse(id).success)return fail(/*i18n*/'Invalid item.');return finish(await changeStorageItem(db(),a,id,'request'));}
export async function withdrawStorageItem(id:string):Promise<ActionResult>{const a=await actor();if(!z.string().uuid().safeParse(id).success)return fail(/*i18n*/'Invalid item.');return finish(await changeStorageItem(db(),a,id,'withdraw'));}
export async function respondStorageItem(id:string,approve:boolean,requestedAt?:string):Promise<ActionResult>{
 const a=await actor();
 if(!z.string().uuid().safeParse(id).success||typeof approve!=='boolean'||
    (requestedAt!==undefined&&!z.string().datetime().safeParse(requestedAt).success))return fail(/*i18n*/'Invalid item.');
 return finish(await changeStorageItem(db(),a,id,approve?'approve':'decline',new Date(),requestedAt));
}

export async function requestPartnerGoalEnd(id:string):Promise<ActionResult> {
  const a=await actor();
  if (!z.string().uuid().safeParse(id).success) return fail('Invalid goal.');
  return finish(await requestGoalEnd(db(),a,id));
}

export async function resolvePartnerGoalEnd(id:string, decision:'approve'|'decline'|'withdraw'):Promise<ActionResult> {
  const a=await actor();
  if (!z.string().uuid().safeParse(id).success||!['approve','decline','withdraw'].includes(decision)) return fail('Invalid goal.');
  return finish(await resolveGoalEnd(db(),a,id,decision));
}


export async function askPartnerForItem(input:unknown):Promise<ActionResult> {
  const a=await actor();
  const parsed=reward.extend({reason:z.string().trim().min(1).max(600)}).safeParse(input);
  if (!parsed.success) return fail(/*i18n*/'Choose an item and enter a reason.');
  const value=parsed.data;
  const valid=REWARD_CATALOG.some(([key])=>key===value.catalogKey && key!=='nothing');
  const item=catalogReward(value);
  if (!valid||!item.title||(value.catalogKey==='contribution'&&!value.amount)) return fail('Choose an item and enter a reason.');
  return finish(await createItemAsk(db(),a,{...item,details:''},value.reason));
}

export async function answerPartnerItemAsk(id:string, decision:'approved'|'declined', restrictions:string):Promise<ActionResult> {
  const a=await actor();
  const detail=z.string().trim().max(600).safeParse(restrictions);
  if (!z.string().uuid().safeParse(id).success||!detail.success||!['approved','declined'].includes(decision)) return fail('Invalid item.');
  return finish(await resolveItemAsk(db(),a,id,decision,detail.data));
}

export async function dismissPartnerItemAsk(id:string):Promise<ActionResult> {
  const a=await actor();
  if (!z.string().uuid().safeParse(id).success) return fail('Invalid item.');
  return finish(await removeItemAsk(db(),a,id));
}

export async function giveUpStorageItem(id:string):Promise<ActionResult> {
  const a=await actor();
  if (!z.string().uuid().safeParse(id).success) return fail('Invalid item.');
  return finish(await forfeitStorageItem(db(),a,id));
}
