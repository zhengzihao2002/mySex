// Tiny i18n: English text is the key; zh.ts maps it to Simplified Chinese.
// Missing translations fall back to English (scripts/check-i18n.mjs lists them).
import { zh } from './zh';

export type Lang = 'en' | 'zh';
export const LANGS: Lang[] = ['en', 'zh'];
export const LANG_COOKIE = 'lang';

export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: string, vars?: Vars): string {
  let s = lang === 'zh' ? (zh[key] ?? key) : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export type T = (key: string, vars?: Vars) => string;
export const makeT = (lang: Lang): T => (key, vars) => translate(lang, key, vars);

export function parseLang(v: string | null | undefined): Lang | null {
  return v === 'zh' || v === 'en' ? v : null;
}

/** Picks zh for Chinese browsers when the user hasn't chosen yet. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  return /^\s*zh|,\s*zh/i.test(header ?? '') ? 'zh' : 'en';
}

export const locale = (lang: Lang) => (lang === 'zh' ? 'zh-CN' : 'en-US');
