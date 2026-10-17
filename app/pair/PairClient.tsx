'use client';
import { useT } from '@/components/I18nProvider';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { Copy, RefreshCw, Share2 } from 'lucide-react';
import { pairWithCode, regenerateInviteCode } from '@/app/actions';
import { FormError } from '@/components/FormError';

export function PairClient({ code }: { code: string }) {
  const { t } = useT();
  const router = useRouter();
  const [state, action, pending] = useActionState(pairWithCode, null);
  const [copied, setCopied] = useState(false);
  const [regen, startRegen] = useTransition();

  // While this screen is open, check every few seconds whether the partner entered our code.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 4000);
    return () => clearInterval(id);
  }, [router]);

  const share = async () => {
    const text = t('Pair with me on mySex 😈 My code: {code}', { code });
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'mySex', text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card relative overflow-hidden text-center">
        <div className="pointer-events-none absolute -inset-1/2 animate-[drift_18s_linear_infinite] bg-[conic-gradient(from_0deg,transparent,rgba(255,61,127,0.18),transparent_40%)]" />
        <p className="label relative">{t('Your invite code')}</p>
        <p className="relative font-mono text-5xl font-black tracking-[0.25em] text-ink">{code}</p>
        <div className="relative mt-4 flex justify-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Copy size={16} /> {copied ? t('Copied!') : t('Copy')}
          </button>
          <button type="button" className="btn-primary" onClick={share}>
            <Share2 size={16} /> {t('Send it')}
          </button>
          <button
            type="button"
            className="btn-ghost px-3"
            aria-label="New code"
            disabled={regen}
            onClick={() => startRegen(async () => void (await regenerateInviteCode()))}
          >
            <RefreshCw size={16} className={regen ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="relative mt-3 flex items-center justify-center gap-2 text-xs text-ink-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose" /> {t('Waiting for your partner…')}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-ink-3">
        <div className="h-px flex-1 bg-line" /> {t('or enter theirs')} <div className="h-px flex-1 bg-line" />
      </div>

      <form action={action} className="space-y-3">
        <input
          className="input text-center font-mono text-2xl tracking-[0.3em] uppercase"
          name="code"
          placeholder="ABC123"
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <FormError error={state && !state.ok ? state.error : null} />
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? t('Connecting…') : t('Pair us up')}
        </button>
      </form>
    </div>
  );
}
