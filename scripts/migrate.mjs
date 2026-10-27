// Applies db/schema.sql to the Neon database. Runs automatically before `next build`
// so every Vercel deploy keeps the schema up to date. The schema is idempotent.
import { readFile } from 'node:fs/promises';
import { neon, neonConfig } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('[migrate] DATABASE_URL is not set — skipping schema migration.');
  process.exit(0);
}

const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

// Split on semicolons that end a line, but keep `do $$ ... $$;` blocks intact.
const statements = [];
let buf = '';
let inDollar = false;
for (const line of schema.split('\n')) {
  if (line.trim().startsWith('--') && !inDollar) continue;
  buf += line + '\n';
  const dollars = (line.match(/\$\$/g) || []).length;
  if (dollars % 2 === 1) inDollar = !inDollar;
  if (!inDollar && line.trimEnd().endsWith(';')) {
    statements.push(buf.trim());
    buf = '';
  }
}
if (buf.trim()) statements.push(buf.trim());

if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
const sql = neon(url);
for (const statement of statements) {
  await sql.query(statement);
}
console.log(`[migrate] applied ${statements.length} statements`);
