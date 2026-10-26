import { getActiveSession, getSessionEditNotices, getSessionDeletionRequests, getSessionEditRequests, requireCouple } from '@/lib/data';
import { redirect } from 'next/navigation';
import { InboxView } from './InboxView';

export const metadata = { title: 'Inbox · mySex' };

export default async function InboxPage() {
  const ctx = await requireCouple();
  if (await getActiveSession(ctx.couple.id)) redirect('/timer');
  const [requests, notices, edits] = await Promise.all([getSessionDeletionRequests(ctx), getSessionEditNotices(ctx), getSessionEditRequests(ctx)]);
  return <InboxView edits={edits} notices={notices} requests={requests} meId={ctx.me.userId} partnerName={ctx.partner.name} />;
}
