import { redirect } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { configProblems } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Finish setup · mySex' };

export default function SetupPage() {
  const problems = configProblems();
  if (!problems.length) redirect('/');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 pt-safe pb-10">
      <Brand subtitle="Almost there — this deployment is missing some settings." />

      <section className="card space-y-3">
        <h2 className="font-semibold">Fix these in Vercel</h2>
        <ul className="space-y-2.5">
          {problems.map((p) => (
            <li key={p.name + p.problem} className="flex gap-2 text-sm">
              <span className="text-menstrual">✗</span>
              <span className="text-ink-2">
                <code className="font-mono font-semibold text-ink">{p.name}</code> {p.problem}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 text-sm text-ink-2">
        <h2 className="font-semibold text-ink">How</h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Vercel → your project → <b className="text-ink">Settings → Environment Variables</b>. Add each variable for <b className="text-ink">Production</b>{' '}
            (and Preview).
          </li>
          <li>
            <code className="font-mono text-ink">DATABASE_URL</code>: Vercel → <b className="text-ink">Storage</b> → connect your Neon database.
          </li>
          <li>
            <code className="font-mono text-ink">NEON_AUTH_BASE_URL</code>: Neon Console → <b className="text-ink">Auth</b> → copy the Auth URL.
          </li>
          <li>
            <code className="font-mono text-ink">NEON_AUTH_COOKIE_SECRET</code>: any random 32+ character string, e.g. from{' '}
            <code className="font-mono text-ink">openssl rand -base64 32</code>.
          </li>
          <li>
            <b className="text-ink">Redeploy</b> (Deployments → ⋯ → Redeploy). New variables only apply to new deployments.
          </li>
        </ol>
      </section>
    </main>
  );
}
