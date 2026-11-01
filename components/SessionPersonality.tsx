'use client';
import { SymbolIcon } from '@/components/SymbolIcon';
import {sessionPersonality} from '@/lib/session-play';
import {useT} from './I18nProvider';
export function SessionPersonality({tags}:{tags:string[]}) {
 const {t}=useT();const cards=sessionPersonality(tags);if(!cards.length)return null;
 return <div className="my-3 rounded-2xl bg-surface-2 p-3"><p className="text-xs text-ink-3">{t('Session personality · based on your tags')}</p><div className="mt-2 flex flex-wrap gap-2">{cards.map(c=><span className="chip" key={c.label}><SymbolIcon value={c.emoji} size={16}/> {t(c.label)}</span>)}</div></div>;
}
