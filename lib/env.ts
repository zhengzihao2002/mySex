// Checks the deployment's configuration so a missing variable shows a setup screen
// instead of a bare "Internal Server Error". Only variable names are ever reported.

export type ConfigProblem = { name: string; problem: string };

export function configProblems(): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  if (!process.env.DATABASE_URL) {
    problems.push({ name: 'DATABASE_URL', problem: 'is missing — connect the Neon database to this Vercel project.' });
  }

  const authUrl = process.env.NEON_AUTH_BASE_URL;
  if (!authUrl) {
    problems.push({ name: 'NEON_AUTH_BASE_URL', problem: 'is missing — copy the Auth URL from Neon Console → Auth.' });
  } else {
    try {
      const u = new URL(authUrl);
      if (u.protocol !== 'https:' && u.hostname !== 'localhost') {
        problems.push({ name: 'NEON_AUTH_BASE_URL', problem: 'must be an https:// URL.' });
      }
    } catch {
      problems.push({ name: 'NEON_AUTH_BASE_URL', problem: 'is not a valid URL — paste the full Auth URL from Neon.' });
    }
  }

  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) {
    problems.push({ name: 'NEON_AUTH_COOKIE_SECRET', problem: 'is missing — set it to a random string of 32+ characters.' });
  } else if (secret.length < 32) {
    problems.push({ name: 'NEON_AUTH_COOKIE_SECRET', problem: `is only ${secret.length} characters — it must be at least 32.` });
  }
  return problems;
}
