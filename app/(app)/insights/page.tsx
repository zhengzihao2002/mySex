import { getDailyLogs, getPeriods, getSessions, requireCouple } from '@/lib/data';
import { InsightsView } from './InsightsView';

export const metadata = { title: 'Insights · mySex' };

export default async function InsightsPage() {
  const ctx = await requireCouple();
  const [periods, sessions, logs] = await Promise.all([
    getPeriods(ctx.her.userId),
    getSessions(ctx.couple.id),
    getDailyLogs(ctx),
  ]);
  return (
    <InsightsView
      periods={periods}
      sessions={sessions.filter((s) => s.status === 'done')}
      herLogs={logs.filter((l) => l.userId === ctx.her.userId)}
      isHer={ctx.me.sex === 'female'}
      herName={ctx.her.name}
      hisName={ctx.him.name}
      defaults={{ cycleLength: ctx.her.cycleLengthDefault, periodLength: ctx.her.periodLengthDefault }}
    />
  );
}
