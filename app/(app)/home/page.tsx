import { getDailyLogs, getNotes, getPeriods, getSessions, requireCouple } from '@/lib/data';
import { addDays } from '@/lib/dates';
import { getToday } from '@/lib/today';
import { HomeView } from './HomeView';

export const metadata = { title: 'mySex' };

export default async function HomePage() {
  const ctx = await requireCouple();
  const { today } = await getToday();
  const [periods, sessions, logs, notes] = await Promise.all([
    getPeriods(ctx.couple.id),
    getSessions(ctx.couple.id),
    getDailyLogs([ctx.me.userId, ctx.partner.userId], addDays(today, -1)),
    getNotes(ctx.couple.id, 5),
  ]);
  return <HomeView ctx={ctx} periods={periods} sessions={sessions} logs={logs} notes={notes} />;
}
