'use client';
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EyeOff } from 'lucide-react';
import { useT } from './I18nProvider';
import { Toggle } from './SessionForm';

const KEY = 'mysex.privacyCover';
const PrivacyContext = createContext({ auto: false, setAuto: (_v: boolean) => {}, hide: () => {} });

/** Visual privacy only. Keep children mounted so covering never loses a form or stops a timer. */
export function PrivacyMode({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const [ready, setReady] = useState(false);
  const [auto, setAutoState] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try { const enabled = localStorage.getItem(KEY) === '1'; setAutoState(enabled); setHidden(enabled); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    const cover = () => { if (auto && document.visibilityState === 'hidden') setHidden(true); };
    document.addEventListener('visibilitychange', cover);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setHidden(true); } };
    window.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('visibilitychange', cover); window.removeEventListener('keydown', key, true); };
  }, [auto]);
  useLayoutEffect(() => {
    if (!hidden) return;
    document.body.dataset.privacyCovered = 'true';
    const title = document.title;
    document.title = 'Private';
    return () => { delete document.body.dataset.privacyCovered; document.title = title; };
  }, [hidden]);
  const setAuto = (value: boolean) => { setAutoState(value); try { localStorage.setItem(KEY, value ? '1' : '0'); } catch {} };
  return <PrivacyContext.Provider value={{ auto, setAuto, hide: () => setHidden(true) }}>
    <style>{`body[data-privacy-covered] > :not([data-privacy-cover]), body[data-privacy-covered] > :not([data-privacy-cover]) * { visibility: hidden !important; }`}</style>
    <div style={{ visibility: !ready || hidden ? 'hidden' : undefined }} inert={!ready || hidden}>{children}</div>
    {ready && !hidden && <button onClick={() => setHidden(true)} className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+100px)] z-[80] rounded-full border border-line bg-surface p-3 text-ink-2 shadow-lg" aria-label={t('Hide screen')} title={t('Hide screen')}><EyeOff size={18} /></button>}
    {ready && hidden && createPortal(<div data-privacy-cover role="dialog" aria-modal="true" aria-label={t('Screen hidden')} className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-bg px-8">
      <EyeOff className="text-ink-3" size={30} /><p className="text-ink-2">{t('Screen hidden')}</p>
      <button autoFocus className="btn-ghost" onClick={() => setHidden(false)}>{t('Show screen')}</button>
    </div>, document.body)}
  </PrivacyContext.Provider>;
}
export function PrivacySettings() {
  const { t } = useT();
  const { auto, setAuto, hide } = useContext(PrivacyContext);
  return <section className="card space-y-3">
    <h2 className="font-semibold">{t('Screen privacy')}</h2>
    <Toggle on={auto} onChange={setAuto} icon={<EyeOff size={16} />} title={t('Cover when opening or returning')} sub={t('On this browser, hide details until you choose to reveal them.')} />
    <button className="btn-ghost w-full" onClick={hide}>{t('Hide screen now')}</button>
    <p className="text-xs text-ink-3">{t('Use the eye button or Escape to hide instantly. Your timer keeps running. Use the passcode lock for access protection.')}</p>
  </section>;
}
