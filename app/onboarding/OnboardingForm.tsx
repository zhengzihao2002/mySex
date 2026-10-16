'use client';

import { useActionState, useState } from 'react';
import { completeOnboarding } from '@/app/actions';
import { FormError } from '@/components/FormError';
import { AVATARS } from '@/lib/content';
import type { Sex } from '@/lib/types';

export function OnboardingForm(props: {
  defaultName: string;
  defaultSex: Sex | null;
  defaultAvatar: string;
  needsConsent: boolean;
}) {
  const [state, action, pending] = useActionState(completeOnboarding, null);
  const [sex, setSex] = useState<Sex | null>(props.defaultSex);
  const [avatar, setAvatar] = useState(props.defaultAvatar);
  const [consent, setConsent] = useState(!props.needsConsent);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" className="input" name="name" defaultValue={props.defaultName} maxLength={40} required />
      </div>

      <div>
        <span className="label">I am</span>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['male', '♂', 'Him', 'from-sky-500/30'],
              ['female', '♀', 'Her', 'from-rose/40'],
            ] as const
          ).map(([value, symbol, label, grad]) => (
            <button
              type="button"
              key={value}
              onClick={() => setSex(value)}
              className={`card flex flex-col items-center gap-1 bg-gradient-to-b to-transparent py-6 transition ${
                sex === value ? `${grad} border-rose ring-2 ring-rose/50` : 'from-transparent'
              }`}
            >
              <span className="text-4xl">{symbol}</span>
              <span className="font-semibold">{label}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="sex" value={sex ?? ''} />
      </div>

      <div>
        <span className="label">Pick your vibe</span>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatar(a)}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-2xl transition ${
                avatar === a ? 'border-rose bg-rose/20' : 'border-line bg-surface-2'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <input type="hidden" name="avatar" value={avatar} />
      </div>

      <label className="card flex cursor-pointer items-start gap-3 border-rose/30 text-sm text-ink-2">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-rose"
        />
        <span>
          I’m <b className="text-ink">18+</b> and I consent to explicit sexual content in this app.
        </span>
      </label>

      <FormError error={state && !state.ok ? state.error : null} />
      <button className="btn-primary w-full" disabled={pending || !sex || !consent}>
        {pending ? 'Saving…' : 'Next: find my partner'}
      </button>
    </form>
  );
}
