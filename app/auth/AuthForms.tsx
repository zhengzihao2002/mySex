'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { resendEmailCode, signInAction, signUpAction, verifyEmailCode } from '@/app/actions';
import { FormError } from '@/components/FormError';
import type { AuthResult } from '@/lib/types';

type Creds = { email: string; password: string };

/** Keeps what was typed so the code step can finish signing in without retyping. */
function useCredsAction(fn: (prev: unknown, form: FormData) => Promise<AuthResult>) {
  const [creds, setCreds] = useState<Creds>({ email: '', password: '' });
  const [state, dispatch, pending] = useActionState(fn, null);
  const action = (form: FormData) => {
    setCreds({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') });
    dispatch(form);
  };
  return { creds, state, action, pending };
}

const errorOf = (s: AuthResult | null) => (s && !s.ok ? (s.error ?? null) : null);
const verifyOf = (s: AuthResult | null) => (s && !s.ok && 'verify' in s ? s.verify : null);

export function SignInForm() {
  const { creds, state, action, pending } = useCredsAction(signInAction);
  const [back, setBack] = useState<AuthResult | null>(null);
  const verify = state !== back ? verifyOf(state) : null;
  if (verify) return <CodeStep email={verify} password={creds.password} note={errorOf(state)} onBack={() => setBack(state)} />;
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="email" type="email" autoComplete="email" placeholder="Email" defaultValue={creds.email} required />
      <input className="input" name="password" type="password" autoComplete="current-password" placeholder="Password" required />
      <FormError error={verifyOf(state) ? null : errorOf(state)} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'Sliding in…' : 'Sign in'}
      </button>
      <p className="pt-2 text-center text-sm text-ink-3">
        New here?{' '}
        <Link href="/auth/sign-up" className="font-semibold text-rose-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const { creds, state, action, pending } = useCredsAction(signUpAction);
  const [back, setBack] = useState<AuthResult | null>(null);
  const verify = state !== back ? verifyOf(state) : null;
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  if (verify) return <CodeStep email={verify} password={creds.password} onBack={() => setBack(state)} />;
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="accessCode">Access code · invite only 🔒</label>
        <input
          id="accessCode"
          className="input font-mono"
          name="accessCode"
          placeholder="The secret code you were given"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </div>
      <input className="input" name="name" autoComplete="given-name" placeholder="First name or nickname" maxLength={40} required />
      <input className="input" name="email" type="email" autoComplete="email" placeholder="Email" required />
      <input className="input" name="password" type="password" autoComplete="new-password" placeholder="Password (8+ characters)" minLength={8} required />

      <div className="card space-y-3 border-rose/30 bg-rose/5">
        <p className="text-xs font-bold tracking-widest text-rose-2 uppercase">Adults only · 18+</p>
        <p className="text-sm leading-relaxed text-ink-2">
          mySex is an explicit app for consenting adult couples. It contains frank sexual language, sex tracking,
          kink lists and dirty dares. Your data is shared only with the one partner you pair with.
        </p>
        <Consent name="adult" checked={adult} onChange={setAdult}>
          I confirm I am <b className="text-ink">18 years or older</b> (or the age of majority where I live).
        </Consent>
        <Consent name="consent" checked={consent} onChange={setConsent}>
          I consent to viewing <b className="text-ink">explicit sexual content</b> and to sharing my logs with my partner.
        </Consent>
      </div>

      <FormError error={errorOf(state)} />
      <button className="btn-primary w-full" disabled={pending || !adult || !consent}>
        {pending ? 'Getting things ready…' : 'I’m 18+ — let’s get naughty'}
      </button>
      <p className="pt-2 text-center text-sm text-ink-3">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="font-semibold text-rose-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function Consent({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-2">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-rose"
        required
      />
      <span>{children}</span>
    </label>
  );
}

function CodeStep({ email, password, note, onBack }: { email: string; password: string; note?: string | null; onBack: () => void }) {
  const [state, action, pending] = useActionState(verifyEmailCode, null);
  const [resending, startResend] = useTransition();
  const [resent, setResent] = useState<string | null>(null);
  const error = errorOf(state);

  return (
    <form action={action} className="space-y-4">
      <div className="card space-y-1 text-center">
        <p className="text-3xl">📬</p>
        <p className="font-semibold">Check your email</p>
        <p className="text-sm text-ink-2">
          We sent a verification code to <b className="text-ink">{email}</b>. Enter it below to unlock mySex.
        </p>
        {note && !error && <p className="text-xs text-ink-3">{note}</p>}
      </div>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="password" value={password} />
      <input
        className="input text-center font-mono text-3xl tracking-[0.5em]"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={8}
        placeholder="••••••"
        autoFocus
        required
      />
      <FormError error={error} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'Checking…' : 'Verify & continue'}
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" className="text-ink-3" onClick={onBack}>
          ← Use a different email
        </button>
        <button
          type="button"
          className="font-semibold text-rose-2 disabled:opacity-50"
          disabled={resending}
          onClick={() =>
            startResend(async () => {
              const res = await resendEmailCode(email);
              setResent(res.ok ? 'New code sent!' : res.error);
            })
          }
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </div>
      {resent && <p className="text-center text-xs text-ink-3">{resent}</p>}
    </form>
  );
}
