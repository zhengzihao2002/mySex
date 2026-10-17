import 'server-only';
import { cookies, headers } from 'next/headers';
import { LANG_COOKIE, langFromAcceptLanguage, makeT, parseLang, type Lang } from './core';
import { makeFmt } from './fmt';

export async function getLang(): Promise<Lang> {
  const chosen = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  if (chosen) return chosen;
  return langFromAcceptLanguage((await headers()).get('accept-language'));
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang), f: makeFmt(lang) };
}
