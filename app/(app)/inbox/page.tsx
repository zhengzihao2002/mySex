import { getSessionDeletionRequests, requireCouple } from '@/lib/data';
import { InboxView } from './InboxView';

export const metadata = { title: 'Inbox · mySex' };

export default async function InboxPage() {
  const ctx = await requireCouple();
  const requests = await getSessionDeletionRequests(ctx);
  return <InboxView requests={requests} meId={ctx.me.userId} partnerName={ctx.partner.name} />;
}
