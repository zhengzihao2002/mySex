import { Brand } from '@/components/Brand';
import { SignUpForm } from '../AuthForms';

export const metadata = { title: 'Create account · mySex' };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 pt-safe pb-10">
      <Brand subtitle="One account each. Pair up with your partner’s invite code and start keeping score." />
      <SignUpForm />
    </main>
  );
}
