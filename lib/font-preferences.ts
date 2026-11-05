export const FONT_COOKIES = { en: 'mysex-font-en', zh: 'mysex-font-zh' } as const;
export const FONT_OPTIONS = {
  en: [
    { id: 'editorial', label: 'Editorial', family: "'Cormorant Garamond Variable', serif", sample: 'A little closer.' },
    { id: 'modern', label: 'Modern', family: "'Manrope Variable', sans-serif", sample: 'A little closer.' },
    { id: 'literary', label: 'Literary', family: "'DM Serif Display', serif", sample: 'A little closer.' },
  ],
  zh: [
    { id: 'song', label: 'Elegant Song', family: "'Noto Serif SC Variable', serif", sample: '再靠近一点。' },
    { id: 'hei', label: 'Modern Hei', family: "'Noto Sans SC Variable', sans-serif", sample: '再靠近一点。' },
    { id: 'brush', label: 'Brush script', family: "'Ma Shan Zheng', cursive", sample: '再靠近一点。' },
  ],
} as const;
export type FontPreferences = { en: string; zh: string };
export function parseFont(language: 'en' | 'zh', value?: string): string {
  return FONT_OPTIONS[language].find(option => option.id === value)?.id ?? FONT_OPTIONS[language][0].id;
}
