import { signBackup } from '@/lib/backups';
import { getCoupleContext, getDailyLogs, getNotes, getPeriods, getSessions, getSessionDeletionRequests } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getCoupleContext();
  if (!ctx) return Response.json({ error: 'Not paired' }, { status: 401 });
  const [sessions, periods, logs, notes, deletionRequests] = await Promise.all([
    getSessions(ctx.couple.id),
    getPeriods(ctx.her.userId),
    getDailyLogs(ctx),
    getNotes(ctx.couple.id, 20000),
    getSessionDeletionRequests(ctx),
  ]);
  const payload = {
      format: 'mysex-backup-v2', coupleId: ctx.couple.id, ownerId: ctx.me.userId,
      exportedAt: new Date().toISOString(),
      couple: { anniversary: ctx.couple.anniversary, me: ctx.me.name, partner: ctx.partner.name },
      sessions,
      periods,
      checkIns: logs,
      notes,
      deletionRequests: deletionRequests.map(({ session: _session, ...receipt }) => receipt),
    };
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) throw new Error('Backup signing is not configured');
  const body = JSON.stringify({ ...payload, signature: signBackup(payload, secret) }, null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mysex-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
