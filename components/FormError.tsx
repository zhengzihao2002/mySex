'use client';

import { useT } from './I18nProvider';

export function FormError({ error }: { error?: string | null }) {
  const { t } = useT();
  if (!error) return null;
  return <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose-2">{t(error)}</p>;
}
