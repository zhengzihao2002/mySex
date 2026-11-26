import {listItemAsks} from '@/lib/partner-item-asks';
import {db} from '@/lib/db';
import {listGoalEndRequests} from '@/lib/partner-goal-end';
import { getActiveSession, getSessionEditNotices, getSessionDeletionRequests, getSessionEditRequests, requireCouple } from '@/lib/data';
import { redirect } from 'next/navigation';
import {partnerMissionBoard} from '@/lib/partner-mission-data';
import { InboxView } from './InboxView';

export const metadata = { title: 'Inbox · mySex' };

export default async function InboxPage() {
  const ctx = await requireCouple();
  if (await getActiveSession(ctx.couple.id)) redirect('/timer');
  const [requests, notices, edits, board, goalEndRequests, itemAsks, storageDeclines] = await Promise.all([getSessionDeletionRequests(ctx), getSessionEditNotices(ctx), getSessionEditRequests(ctx), partnerMissionBoard(ctx.couple.id,ctx.me.userId,ctx.partner.userId), listGoalEndRequests(db(),{coupleId:ctx.couple.id,userId:ctx.me.userId,partnerId:ctx.partner.userId}), listItemAsks(db(),{coupleId:ctx.couple.id,userId:ctx.me.userId,partnerId:ctx.partner.userId}),
    db()`select id,title,reason from partner_storage_declines where couple_id=${ctx.couple.id}
      and recipient_id=${ctx.me.userId} and created_at>now()-interval '7 days' order by created_at desc`,
  ]);
  const goalInvites=board.missions
    .filter(m=>m.status==='invited'&&!m.expired)
    .sort((a,b)=>Number(b.assigneeId===ctx.me.userId)-Number(a.assigneeId===ctx.me.userId)||a.createdAt.localeCompare(b.createdAt));
  const declinedGoals=board.missions.filter(m=>m.status==='declined'&&m.issuerId===ctx.me.userId);
  return <InboxView declinedGoals={declinedGoals} goalInvites={goalInvites} storageDeclines={storageDeclines.map(({id,title,reason})=>({id,title,reason}))} itemAsks={itemAsks} goalEndRequests={goalEndRequests} storageRequests={board.items.filter(i=>i.issuerId===ctx.me.userId&&i.status==='requested')} edits={edits} notices={notices} requests={requests} meId={ctx.me.userId} partnerName={ctx.partner.name} />;
}
