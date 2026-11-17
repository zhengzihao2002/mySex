import { getDailyLogs, getNotes, getPeriods, getSessions, requireCouple } from '@/lib/data';
import { addDays } from '@/lib/dates';
import { getToday } from '@/lib/today';
import {partnerMissionBoard} from '@/lib/partner-mission-data';
import { HomeView } from './HomeView';

export const metadata = { title: 'mySex' };

export default async function HomePage() {
  const ctx = await requireCouple();
  const { today } = await getToday();
  const [periods, sessions, logs, notes, partnerBoard] = await Promise.all([
    getPeriods(ctx.her.userId),
    getSessions(ctx.couple.id),
    getDailyLogs(ctx, addDays(today, -1)),
    getNotes(ctx.couple.id, 5),
    partnerMissionBoard(ctx.couple.id,ctx.me.userId,ctx.partner.userId),
  ]);
  return <HomeView partnerMissionSummary={{invitations:partnerBoard.missions.filter(m=>m.status==='invited'&&m.assigneeId===ctx.me.userId).length,active:partnerBoard.missions.filter(m=>m.status==='active').length,ready:partnerBoard.items.filter(i=>i.ownerId===ctx.me.userId&&i.status==='ready').length,approvals:partnerBoard.items.filter(i=>i.issuerId===ctx.me.userId&&i.status==='requested').length}} ctx={ctx} periods={periods} sessions={sessions} logs={logs} notes={notes} />;
}
