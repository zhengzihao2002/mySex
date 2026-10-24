import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCoupleContext } from '@/lib/data';
import { db } from '@/lib/db';
import { MAX_BACKUP_BYTES, verifyBackup, restoreBackup } from '@/lib/backups';
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== request.headers.get('host')) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const ctx = await getCoupleContext();
  if (!ctx) return Response.json({ error: 'Not paired' }, { status: 401 });
  // Bound streaming input as well as Content-Length; a forged header cannot bypass the limit.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Invalid backup file.' }, { status: 400 });
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BACKUP_BYTES) { await reader.cancel(); return Response.json({ error: 'Backup is too large (maximum 3 MB).' }, { status: 413 }); }
    chunks.push(value);
  }
  const who = { coupleId: ctx.couple.id, userId: ctx.me.userId, partnerId: ctx.partner.userId, isHer: ctx.me.sex === 'female' };
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) return Response.json({ error: 'Backup signing is not configured' }, { status: 503 });
  let backup;
  try { backup = verifyBackup(JSON.parse(Buffer.concat(chunks).toString('utf8')), secret, who); }
  catch (e) { return Response.json({ error: e instanceof SyntaxError ? 'Invalid backup file.' : (e as Error).message }, { status: 400 }); }
  const apply = request.nextUrl.searchParams.get('apply') === 'true';
  const counts = await restoreBackup(db(), backup, who, apply);
  if (apply) revalidatePath('/', 'layout');
  return Response.json({ counts }, { headers: { 'Cache-Control': 'no-store' } });
}
