'use client';

import { createContext, useContext, useMemo } from 'react';
import { makeT, type Lang, type T } from '@/lib/i18n/core';
import { makeFmt, type Fmt } from '@/lib/i18n/fmt';

const Ctx = createContext<{ lang: Lang; t: T; f: Fmt }>({ lang: 'en', t: makeT('en'), f: makeFmt('en') });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang), f: makeFmt(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** { t, f, lang } — t translates English text, f formats dates/durations in the current language. */
export const useT = () => useContext(Ctx);
