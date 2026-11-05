'use client';
import { useState } from 'react';
import { Check, Type } from 'lucide-react';
import { FONT_COOKIES, FONT_OPTIONS, type FontPreferences } from '@/lib/font-preferences';
import { useT } from './I18nProvider';

export function FontSettings({ initial }: { initial: FontPreferences }) {
  const { t } = useT();
  const [chosen, setChosen] = useState(initial);
  const choose = (language: 'en' | 'zh', id: string) => {
    document.cookie = `${FONT_COOKIES[language]}=${id}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    document.documentElement.dataset[language === 'en' ? 'fontEn' : 'fontZh'] = id;
    setChosen(previous => ({ ...previous, [language]: id }));
  };
  return <section className="card space-y-5">
    <div><h2 className="flex items-center gap-2 text-lg"><Type size={18}/>{t('Fonts')}</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-3">{t('Choose heading styles for each language. Body text stays easy to read. Saved on this device.')}</p></div>
    {(['en', 'zh'] as const).map(language => <fieldset key={language}>
      <legend className="label">{language === 'en' ? t('English headings') : t('Chinese headings')}</legend>
      <div className="grid gap-2 sm:grid-cols-3">{FONT_OPTIONS[language].map(option => <button key={option.id} type="button" aria-pressed={chosen[language] === option.id}
        onClick={() => choose(language, option.id)} className={`font-option rounded-2xl border p-3 text-left ${chosen[language] === option.id ? 'border-rose/60 bg-rose/10' : 'border-line bg-surface-2/40'}`}>
        <span className="mb-2 flex items-center justify-between gap-2 text-xs text-ink-2">{t(option.label)}{chosen[language] === option.id && <Check size={14} className="text-rose-2"/>}</span>
        <span lang={language === 'zh' ? 'zh-CN' : 'en'} style={{fontFamily:option.family}} className="block text-xl leading-relaxed">{option.sample}</span>
      </button>)}</div>
    </fieldset>)}
  </section>;
}
