import type {SexSession, SessionEditRequest} from './types';

export const sharedFields = ['kind','startedAt','durationMin','breakMin','place','protection','tags','location'] as const;
export type SharedField = typeof sharedFields[number];
export type SessionProposal = NonNullable<SessionEditRequest['proposed']>;
export type SharedValues = Pick<SessionProposal,'kind'|'startedAt'|'durationMin'|'breakMin'|'place'|'protection'|'tags'> & {
  location: SessionProposal['location'] | null;
};

/** The map rounds pins to six decimals; sub-pixel rounding is not a new location. */
export function samePin(a: {latitude:number;longitude:number}|null|undefined, b: {latitude:number;longitude:number}|null|undefined) {
  return !a && !b || !!a && !!b && Math.abs(a.latitude-b.latitude)<0.000001 && Math.abs(a.longitude-b.longitude)<0.000001;
}

export function sharedValues(s:SexSession, proposal?:SessionProposal|null):SharedValues {
  return {
    kind:proposal?.kind??s.kind, startedAt:proposal?.startedAt??s.startedAt,
    durationMin:proposal?.durationMin??(s.durationSec??0)/60, breakMin:proposal?.breakMin??s.pausedSec/60,
    place:proposal?proposal.place:s.place, protection:proposal?proposal.protection:s.protection,
    tags:proposal?.tags??s.tags,
    location:proposal?.location??(s.latitude!=null&&s.longitude!=null?{latitude:s.latitude,longitude:s.longitude,city:s.city,region:s.region,country:s.country,gpsNamedAt:s.gpsNamedAt??null}:null),
  };
}

export function sameSharedField(key:SharedField,a:SharedValues[SharedField],b:SharedValues[SharedField]) {
  if(key==='location')return samePin(a as SharedValues['location'],b as SharedValues['location']);
  if(key==='startedAt')return new Date(a as string).getTime()===new Date(b as string).getTime();
  if(key==='durationMin'||key==='breakMin')return Math.round(Number(a)*60)===Math.round(Number(b)*60);
  if(key==='tags')return JSON.stringify([...(a as string[])].sort())===JSON.stringify([...(b as string[])].sort());
  return (a||null)===(b||null);
}

/** Merge only fields touched in this editor. Returning to the saved values cancels the proposal. */
export function mergeSharedProposal(s:SexSession,pending:SessionProposal|null,patch:Partial<SharedValues>):SessionProposal|null {
  const original=sharedValues(s),next={...sharedValues(s,pending),...patch};
  if(sharedFields.every(key=>sameSharedField(key,original[key],next[key])))return null;
  const {location,...values}=next;
  return {...values,rating:s.rating,hisOrgasms:s.hisOrgasms,herOrgasms:s.herOrgasms,notes:s.notes,
    ...(!samePin(location,original.location)&&location?{location}:{})};
}
