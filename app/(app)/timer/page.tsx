import { getSessions, requireCouple } from '@/lib/data';
import { TimerView } from './TimerView';

export const metadata = { title: 'Live timer · mySex' };

export default async function TimerPage() {
  const ctx = await requireCouple();
  const sessions = await getSessions(ctx.couple.id);
  return (
    <TimerView
      sessions={sessions}
      names={{ [ctx.me.userId]: ctx.me.name, [ctx.partner.userId]: ctx.partner.name }}
      meId={ctx.me.userId}
    />
  );
}
