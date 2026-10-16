import { getNotes, requireCouple } from '@/lib/data';
import { NotesView } from './NotesView';

export const metadata = { title: 'Notes · mySex' };

export default async function NotesPage() {
  const ctx = await requireCouple();
  const notes = await getNotes(ctx.couple.id, 150);
  return <NotesView notes={notes} meId={ctx.me.userId} partnerName={ctx.partner.name} partnerAvatar={ctx.partner.avatar} />;
}
