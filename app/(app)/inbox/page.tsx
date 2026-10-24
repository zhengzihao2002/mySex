import { getActiveSession, getSessionEditNotices, getSessionDeletionRequests, requireCouple } from '@/lib/data';
import { redirect } from 'next/navigation';
import { InboxView } from './InboxView';

export const metadata = { title: 'Inbox · mySex' };

export default async function InboxPage() {
  const ctx = await requireCouple();
  if (await getActiveSession(ctx.couple.id)) redirect('/timer');
  const [requests, notices] = await Promise.all([getSessionDeletionRequests(ctx), getSessionEditNotices(ctx)]);
  return <InboxView notices={notices} requests={requests} meId={ctx.me.userId} partnerName={ctx.partner.name} />;
}
