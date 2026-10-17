import { Brand } from '@/components/Brand';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { getT } from '@/lib/i18n/server';
import { SignInForm } from '../AuthForms';

export const metadata = { title: 'Sign in · mySex' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ revoked?: string }> }) {
  const { revoked } = await searchParams;
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 pt-safe pb-10">
      <LanguageSwitch className="self-end" />
      <Brand subtitle={t('Track your sex life, her cycle and every naughty little detail — together, privately.')} />
      {revoked && (
        <p className="rounded-2xl border border-luteal/50 bg-luteal/10 px-4 py-3 text-center text-sm text-ink-2">
          🔒 {t('This device was signed out from another device. Sign in again if that was you.')}
        </p>
      )}
      <SignInForm />
      <p className="text-center text-[11px] leading-relaxed text-ink-3">
        {t('18+ only. Cycle predictions are estimates and are not birth control.')}
      </p>
    </main>
  );
}
