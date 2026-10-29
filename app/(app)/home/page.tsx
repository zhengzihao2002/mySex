import {getMissionRuns} from '@/lib/mission-store';
import {db} from '@/lib/db';
import { getDailyLogs, getNotes, getPeriods, getSessions, requireCouple } from '@/lib/data';
import { addDays } from '@/lib/dates';
import { getToday } from '@/lib/today';
import { HomeView } from './HomeView';

export const metadata = { title: 'mySex' };

export default async function HomePage() {
  const ctx = await requireCouple();
  const { today } = await getToday();
  const [periods, sessions, logs, notes, missions] = await Promise.all([
    getPeriods(ctx.her.userId),
    getSessions(ctx.couple.id),
    getDailyLogs(ctx, addDays(today, -1)),
    getNotes(ctx.couple.id, 5),
    getMissionRuns(db(),ctx.couple.id),
  ]);
  return <HomeView missions={missions} ctx={ctx} periods={periods} sessions={sessions} logs={logs} notes={notes} />;
}
