import { createNeonAuth } from '@neondatabase/auth/next/server';

type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | null = null;

/** Lazily created so builds don't crash when env vars are only present at runtime. */
export function getAuth(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret) {
      throw new Error('NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set. See README.md.');
    }
    instance = createNeonAuth({ baseUrl, cookies: { secret } });
  }
  return instance;
}
