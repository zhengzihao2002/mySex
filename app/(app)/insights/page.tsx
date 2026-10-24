import { getNotes, getDailyLogs, getPeriods, getSessions, requireCouple } from '@/lib/data';
import { InsightsView } from './InsightsView';

export const metadata = { title: 'Insights · mySex' };

export default async function InsightsPage() {
  const ctx = await requireCouple();
  const [periods, sessions, logs, notes] = await Promise.all([
    getPeriods(ctx.her.userId),
    getSessions(ctx.couple.id),
    getDailyLogs(ctx),
    getNotes(ctx.couple.id, 10000),
  ]);
  return (
    <InsightsView
      logs={logs}
      notes={notes}
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
