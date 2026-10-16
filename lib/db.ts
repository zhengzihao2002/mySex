import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';

// Optional: point the HTTP driver at a local Neon-compatible proxy for offline development.
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;

let client: NeonQueryFunction<false, false> | null = null;

function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set. See README.md.');
    client = neon(url);
  }
  return client;
}

/** Tagged-template SQL over Neon's HTTP driver (one round trip per query, no pool). */
export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getClient()(strings, ...values)) as unknown as NeonQueryFunction<false, false>;

export function db() {
  return getClient();
}
