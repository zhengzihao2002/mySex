'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLanguage } from '@/app/actions';
import { useT } from './I18nProvider';

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { lang } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={`inline-flex rounded-full border border-line bg-surface-2 p-0.5 text-xs font-semibold ${className}`} role="group" aria-label="Language">
      {(
        [
          ['en', 'EN'],
          ['zh', '中文'],
        ] as const
      ).map(([l, label]) => (
        <button
          key={l}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setLanguage(l);
              router.refresh();
            })
          }
          className={`rounded-full px-3 py-1 transition ${lang === l ? 'bg-rose text-white' : 'text-ink-3'}`}
          aria-pressed={lang === l}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
