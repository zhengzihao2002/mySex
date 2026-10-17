import { Brand } from '@/components/Brand';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { getT } from '@/lib/i18n/server';
import { SignUpForm } from '../AuthForms';

export const metadata = { title: 'Create account · mySex' };

export default async function SignUpPage() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 pt-safe pb-10">
      <LanguageSwitch className="self-end" />
      <Brand subtitle={t('One account each. Pair up with your partner’s invite code and start keeping score.')} />
      <SignUpForm />
    </main>
  );
}
