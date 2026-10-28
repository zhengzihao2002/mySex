import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { cleanupExpiredData } from '@/lib/privacy';

export const dynamic = 'force-dynamic';

/** Fixed TTL cleanup only: no record IDs, user input, or returned user data. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(request.headers.get('authorization') ?? '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return new Response(null, { status: 401 });
    }
  } else if (request.headers.get('user-agent') !== 'vercel-cron/1.0') {
    return new Response(null, { status: 404 });
  }
  // Without CRON_SECRET this is deliberately a public, fixed TTL sweep, not a privileged API.
  await cleanupExpiredData(db());
  return Response.json({ ok: true });
}
