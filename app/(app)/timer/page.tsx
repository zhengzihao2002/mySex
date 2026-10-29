import { getSessions, requireCouple } from '@/lib/data';
import { TimerView } from './TimerView';

export const metadata = { title: 'Live timer · mySex' };

export default async function TimerPage({searchParams}:{searchParams:Promise<{kind?:string}>}) {
  const ctx = await requireCouple();
  const [sessions,params]=await Promise.all([getSessions(ctx.couple.id),searchParams]);
  return (
    <TimerView
      sessions={sessions}
      initialKind={params.kind==='oral'?'oral':'intercourse'}
      names={{ [ctx.me.userId]: ctx.me.name, [ctx.partner.userId]: ctx.partner.name }}
      meId={ctx.me.userId}
    />
  );
}
