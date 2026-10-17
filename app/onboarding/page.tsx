import { redirect } from 'next/navigation';
import { signOutAction } from '@/app/actions';
import { hasCoupleHistory, requireViewer } from '@/lib/data';
import { getT } from '@/lib/i18n/server';
import { OnboardingForm } from './OnboardingForm';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  const { t } = await getT();
  if (viewer.profile?.sex && viewer.profile.adultConsentAt && viewer.profile.coupleId) redirect('/home');
  if (!viewer.profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5 pt-safe pb-10 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="font-display text-2xl font-bold">{t('Invite only')}</h1>
        <p className="text-sm text-ink-2">{t('This account wasn’t created with a mySex access code. Sign out and create an account with the code.')}</p>
        <form action={signOutAction}>
          <button className="btn-primary w-full">{t('Sign out')}</button>
        </form>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 pt-safe pb-10">
      <div>
        <p className="text-sm font-semibold text-rose-2">{t('Step 1 of 2')}</p>
        <h1 className="font-display mt-1 text-3xl font-bold">{t('Who are you in bed?')}</h1>
        <p className="mt-2 text-sm text-ink-2">
          {t('We pair one him with one her. Pick your sex — it decides who logs periods and who gets the “how to treat her right” tips.')}
        </p>
      </div>
      <OnboardingForm
        defaultName={viewer.profile?.name ?? viewer.user.name ?? ''}
        defaultSex={viewer.profile?.sex ?? null}
        defaultAvatar={viewer.profile?.avatar ?? '💋'}
        needsConsent={!viewer.profile?.adultConsentAt}
        sexLocked={!!viewer.profile.sex && (await hasCoupleHistory(viewer.user.id))}
      />
    </main>
  );
}
