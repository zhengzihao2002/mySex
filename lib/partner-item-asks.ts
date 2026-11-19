import type {NeonQueryFunction} from '@neondatabase/serverless';
import {partnerMissionMember, type PartnerMissionActor, type RewardInput} from './partner-mission-store.ts';

type Client = NeonQueryFunction<false,false>;
export type ItemAsk = {id:string; requestedBy:string; title:string; reason:string; decision:'approved'|'declined'|null};

export async function listItemAsks(client: Client, actor: PartnerMissionActor): Promise<ItemAsk[]> {
  if (!await partnerMissionMember(client,actor)) return [];
  const rows = await client`select id,requested_by,title,reason,decision from partner_item_asks
    where couple_id=${actor.coupleId} and (
      (requested_by=${actor.userId} and created_at>now()-interval '7 days')
      or (recipient_id=${actor.userId} and decision is null and created_at>now()-interval '7 days'))
    order by created_at desc`;
  return rows.map(row=>({id:row.id,requestedBy:row.requested_by,title:row.title,reason:row.reason,decision:row.decision}));
}

export async function createItemAsk(client: Client, actor: PartnerMissionActor, item: RewardInput, reason: string) {
  const rows = await client`insert into partner_item_asks(couple_id,requested_by,recipient_id,title,icon,reason)
    select c.id,${actor.userId},${actor.partnerId},${item.title},${item.icon},${reason}
    from couples c join profiles sender on sender.user_id=${actor.userId} and sender.couple_id=c.id
    join profiles recipient on recipient.user_id=${actor.partnerId} and recipient.couple_id=c.id
    where c.id=${actor.coupleId} and c.unpaired_at is null
    and (${actor.userId},${actor.partnerId}) in ((c.male_id,c.female_id),(c.female_id,c.male_id))
    returning id`;
  return rows.length>0;
}

export async function resolveItemAsk(client: Client, actor: PartnerMissionActor, id: string, decision:'approved'|'declined', restrictions:string) {
  const rows = await client`with decided as (
    update partner_item_asks r set decision=${decision},decided_at=now()
    from couples c, profiles recipient, profiles sender
    where r.id=${id} and r.couple_id=${actor.coupleId} and c.id=r.couple_id and c.unpaired_at is null
      and r.recipient_id=${actor.userId} and r.requested_by=${actor.partnerId}
      and recipient.user_id=r.recipient_id and recipient.couple_id=c.id
      and sender.user_id=r.requested_by and sender.couple_id=c.id
      and r.decision is null and r.created_at>now()-interval '7 days'
    returning r.*
  ), granted as (
    insert into partner_storage_items(couple_id,owner_id,issuer_id,kind,title,details,icon)
    select couple_id,requested_by,recipient_id,'ask',title,${restrictions},icon
    from decided where decision='approved'
  ) select id from decided`;
  return rows.length>0;
}

export async function removeItemAsk(client: Client, actor: PartnerMissionActor, id:string) {
  if (!await partnerMissionMember(client,actor)) return false;
  const rows=await client`delete from partner_item_asks where id=${id} and couple_id=${actor.coupleId}
    and requested_by=${actor.userId} returning id`;
  return rows.length>0;
}
