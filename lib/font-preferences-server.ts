import 'server-only';
import { cookies } from 'next/headers';
import { FONT_COOKIES, parseFont } from './font-preferences';
export async function getFontPreferences() {
  const jar = await cookies();
  return { en: parseFont('en', jar.get(FONT_COOKIES.en)?.value), zh: parseFont('zh', jar.get(FONT_COOKIES.zh)?.value) };
}
