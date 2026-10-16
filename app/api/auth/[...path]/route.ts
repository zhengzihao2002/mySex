import { getAuth } from '@/lib/auth/server';

type Ctx = { params: Promise<{ path: string[] }> };

// Sign-up must go through our server action, which checks the invite-only access code.
// Block the raw Better Auth sign-up endpoints so they can't be called directly.
async function blocked(ctx: Ctx) {
  const { path } = await ctx.params;
  return path[0]?.startsWith('sign-up');
}

const forbidden = () => Response.json({ message: 'Sign-up is invite-only.' }, { status: 403 });

export async function GET(req: Request, ctx: Ctx) {
  if (await blocked(ctx)) return forbidden();
  return getAuth().handler().GET(req, ctx);
}

export async function POST(req: Request, ctx: Ctx) {
  if (await blocked(ctx)) return forbidden();
  return getAuth().handler().POST(req, ctx);
}
