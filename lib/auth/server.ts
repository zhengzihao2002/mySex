import { createNeonAuth } from '@neondatabase/auth/next/server';
import { configProblems } from '@/lib/env';

type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | null = null;

/** Lazily created so builds don't crash when env vars are only present at runtime. */
export function getAuth(): NeonAuth {
  if (!instance) {
    const problems = configProblems().filter((p) => p.name.startsWith('NEON_AUTH'));
    if (problems.length) {
      throw new Error(`mySex is not configured: ${problems.map((p) => `${p.name} ${p.problem}`).join(' ')} See /setup.`);
    }
    instance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
    });
  }
  return instance;
}
