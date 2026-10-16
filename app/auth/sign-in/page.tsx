import { Brand } from '@/components/Brand';
import { SignInForm } from '../AuthForms';

export const metadata = { title: 'Sign in · mySex' };

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 pt-safe pb-10">
      <Brand subtitle="Track your sex life, her cycle and every naughty little detail — together, privately." />
      <SignInForm />
      <p className="text-center text-[11px] leading-relaxed text-ink-3">
        18+ only. Cycle predictions are estimates and are not birth control.
      </p>
    </main>
  );
}
