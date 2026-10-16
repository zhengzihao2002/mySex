import { getDailyLogs, getPeriods, getSessions, requireCouple } from '@/lib/data';
import { CalendarView } from './CalendarView';

export const metadata = { title: 'Calendar · mySex' };

export default async function CalendarPage() {
  const ctx = await requireCouple();
  const [periods, sessions, logs] = await Promise.all([
    getPeriods(ctx.couple.id),
    getSessions(ctx.couple.id),
    getDailyLogs([ctx.me.userId, ctx.partner.userId]),
  ]);
  return (
    <CalendarView
      periods={periods}
      sessions={sessions.filter((s) => s.status === 'done')}
      logs={logs}
      me={ctx.me}
      partner={ctx.partner}
      defaults={{ cycleLength: ctx.her.cycleLengthDefault, periodLength: ctx.her.periodLengthDefault }}
    />
  );
}
