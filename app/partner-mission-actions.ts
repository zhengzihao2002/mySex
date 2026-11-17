'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {requireCouple} from '@/lib/data';
import {db} from '@/lib/db';
import {INTERCOURSE_POSITIONS} from '@/lib/activity-details';
import type {ActionResult} from '@/lib/types';
import {insertPartnerMission,decidePartnerMission,changeStorageItem,type PartnerMissionActor} from '@/lib/partner-mission-store';
const reward=z.object({title:z.string().trim().min(1).max(100),details:z.string().trim().max(600).default(''),icon:z.enum(['gift','ticket','sparkles','camera','coins','heart','crown'])});
const schema=z.object({title:z.string().trim().min(1).max(80),description:z.string().trim().max(500).default(''),metric:z.enum(['active_minutes','total_minutes','sessions','positions']),target:z.number().finite().positive().max(1000000),startsAt:z.string().datetime(),endsAt:z.string().datetime(),reward:reward.nullable().default(null),bonusMultiplier:z.number().finite().min(2).max(10).nullable().default(null),bonusReward:reward.nullable().default(null),failureClaim:reward.nullable().default(null)}).superRefine((v,ctx)=>{
 const start=Date.parse(v.startsAt),end=Date.parse(v.endsAt),now=Date.now();
 if(start<now-86400000||end<=now||end<=start||end-start>366*86400000)ctx.addIssue({code:'custom',message:'Invalid mission window.'});
 if((v.metric==='sessions'||v.metric==='positions')&&!Number.isInteger(v.target))ctx.addIssue({code:'custom',message:'Use a whole-number target.'});
 if(v.metric==='positions'&&(v.target>INTERCOURSE_POSITIONS.length||v.target*(v.bonusMultiplier??1)>INTERCOURSE_POSITIONS.length))ctx.addIssue({code:'custom',message:'The position target exceeds the recorded position types.'});
 if(!!v.bonusReward!==!!v.bonusMultiplier)ctx.addIssue({code:'custom',message:'Choose both a bonus target and bonus prize.'});
});
const fail=(error:string):ActionResult=>({ok:false,error});
function finish(ok:boolean):ActionResult{if(!ok)return fail(/*i18n*/'This mission or item changed. Refresh and try again.');revalidatePath('/','layout');return {ok:true};}
async function actor():Promise<PartnerMissionActor>{const ctx=await requireCouple();return {coupleId:ctx.couple.id,userId:ctx.me.userId,partnerId:ctx.partner.userId};}
export async function createPartnerMission(input:unknown):Promise<ActionResult>{
 const a=await actor(),parsed=schema.safeParse(input);
 if(!parsed.success)return fail(/*i18n*/'Check the mission goal, dates and reward details.');
 return finish(await insertPartnerMission(db(),a,parsed.data));
}
export async function respondPartnerMission(id:string,decision:'accept'|'decline'|'cancel'):Promise<ActionResult>{
 const a=await actor();if(!z.string().uuid().safeParse(id).success||!['accept','decline','cancel'].includes(decision))return fail(/*i18n*/'Invalid mission.');
 return finish(await decidePartnerMission(db(),a,id,decision));
}
export async function requestStorageItem(id:string):Promise<ActionResult>{const a=await actor();if(!z.string().uuid().safeParse(id).success)return fail(/*i18n*/'Invalid item.');return finish(await changeStorageItem(db(),a,id,'request'));}
export async function withdrawStorageItem(id:string):Promise<ActionResult>{const a=await actor();if(!z.string().uuid().safeParse(id).success)return fail(/*i18n*/'Invalid item.');return finish(await changeStorageItem(db(),a,id,'withdraw'));}
export async function respondStorageItem(id:string,approve:boolean):Promise<ActionResult>{const a=await actor();if(!z.string().uuid().safeParse(id).success||typeof approve!=='boolean')return fail(/*i18n*/'Invalid item.');return finish(await changeStorageItem(db(),a,id,approve?'approve':'decline'));}
