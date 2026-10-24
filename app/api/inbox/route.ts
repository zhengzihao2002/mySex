import { getCoupleContext, getInboxSnapshot } from '@/lib/data';
export const dynamic = 'force-dynamic';
export async function GET() {
  const ctx = await getCoupleContext();
  if (!ctx) return Response.json({ error: 'Not paired' }, { status: 401 });
  return Response.json(await getInboxSnapshot(ctx.couple.id, ctx.me.userId), { headers: { 'Cache-Control': 'no-store' } });
}
