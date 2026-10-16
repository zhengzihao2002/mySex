import { getCoupleContext, getDailyLogs, getNotes, getPeriods, getSessions } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getCoupleContext();
  if (!ctx) return Response.json({ error: 'Not paired' }, { status: 401 });
  const [sessions, periods, logs, notes] = await Promise.all([
    getSessions(ctx.couple.id),
    getPeriods(ctx.her.userId),
    getDailyLogs(ctx),
    getNotes(ctx.couple.id, 1000),
  ]);
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      couple: { anniversary: ctx.couple.anniversary, me: ctx.me.name, partner: ctx.partner.name },
      sessions,
      periods,
      checkIns: logs,
      notes,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mysex-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
