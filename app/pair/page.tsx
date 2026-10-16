import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOutAction } from '@/app/actions';
import { requireViewer } from '@/lib/data';
import { PairClient } from './PairClient';

export const dynamic = 'force-dynamic';

export default async function PairPage() {
  const viewer = await requireViewer();
  const me = viewer.profile;
  if (!me?.sex || !me.adultConsentAt) redirect('/onboarding');
  if (me.coupleId) redirect('/home');
  const want = me.sex === 'male' ? 'her' : 'him';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 pt-safe pb-10">
      <div>
        <p className="text-sm font-semibold text-rose-2">Step 2 of 2</p>
        <h1 className="font-display mt-1 text-3xl font-bold">Hook up with {want} {me.sex === 'male' ? '💗' : '💙'}</h1>
        <p className="mt-2 text-sm text-ink-2">
          Send {want} your code, or type in {me.sex === 'male' ? 'hers' : 'his'}. Only one of you needs to enter a
          code — the other side connects automatically.
        </p>
      </div>
      <PairClient code={me.inviteCode} />
      <div className="flex justify-between text-sm text-ink-3">
        <Link href="/onboarding">Edit my profile</Link>
        <form action={signOutAction}>
          <button>Sign out</button>
        </form>
      </div>
    </main>
  );
}
