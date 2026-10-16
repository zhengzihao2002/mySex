'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signInAction, signUpAction } from '@/app/actions';
import { FormError } from '@/components/FormError';

export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="email" type="email" autoComplete="email" placeholder="Email" required />
      <input className="input" name="password" type="password" autoComplete="current-password" placeholder="Password" required />
      <FormError error={state && !state.ok ? state.error : null} />
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
  const [state, action, pending] = useActionState(signUpAction, null);
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
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

      <FormError error={state && !state.ok ? state.error : null} />
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
