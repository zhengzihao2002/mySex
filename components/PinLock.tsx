'use client';
import { useT } from './I18nProvider';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Delete, Lock } from 'lucide-react';

// A per-device 4-digit passcode so nobody snooping on your phone opens the dirty stuff.
// Only a SHA-256 hash is stored, in localStorage on this device.

const KEY = 'mysex.pin';
const LOCK_AFTER_MS = 60_000;

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`mysex:${pin}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function readPin(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const PinContext = createContext<{ hasPin: boolean; setPin: (pin: string | null) => Promise<void> }>({
  hasPin: false,
  setPin: async () => {},
});
export const usePin = () => useContext(PinContext);

export function PinLock({ children }: { children: React.ReactNode }) {
  const [hash, setHash] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const h = readPin();
    setHash(h);
    if (h) setLocked(true);
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > LOCK_AFTER_MS && readPin()) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const setPin = useCallback(async (pin: string | null) => {
    try {
      if (pin) {
        const h = await hashPin(pin);
        localStorage.setItem(KEY, h);
        setHash(h);
      } else {
        localStorage.removeItem(KEY);
        setHash(null);
      }
    } catch {}
  }, []);

  return (
    <PinContext.Provider value={{ hasPin: !!hash, setPin }}>
      {locked && hash ? <LockScreen hash={hash} onUnlock={() => setLocked(false)} /> : children}
    </PinContext.Provider>
  );
}

function LockScreen({ hash, onUnlock }: { hash: string; onUnlock: () => void }) {
  const { t } = useT();
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (digits.length !== 4) return;
    hashPin(digits).then((h) => {
      if (h === hash) onUnlock();
      else {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDigits('');
        }, 400);
      }
    });
  }, [digits, hash, onUnlock]);

  return <Keypad title={t('Enter passcode')} digits={digits} setDigits={setDigits} shake={shake} />;
}

export function Keypad({
  title,
  digits,
  setDigits,
  shake,
  onCancel,
}: {
  title: string;
  digits: string;
  setDigits: (fn: (d: string) => string) => void;
  shake?: boolean;
  onCancel?: () => void;
}) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-10 bg-bg/95 px-8 backdrop-blur-2xl">
      <div className="flex flex-col items-center gap-3">
        <Lock className="text-rose-2" />
        <p className="text-lg font-semibold">{t(title)}</p>
        <div className={`flex gap-4 ${shake ? 'animate-[shake_0.4s]' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 border-rose-2 ${i < digits.length ? 'bg-rose-2' : ''}`} />
          ))}
        </div>
      </div>
      <div className="grid w-full max-w-xs grid-cols-3 gap-5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <PadButton key={n} onClick={() => setDigits((d) => (d.length < 4 ? d + n : d))}>
            {n}
          </PadButton>
        ))}
        <button className="text-sm text-ink-3" onClick={onCancel} disabled={!onCancel}>
          {onCancel ? t('Cancel') : ''}
        </button>
        <PadButton onClick={() => setDigits((d) => (d.length < 4 ? d + '0' : d))}>0</PadButton>
        <button className="flex items-center justify-center text-ink-2" onClick={() => setDigits((d) => d.slice(0, -1))} aria-label="Delete">
          <Delete />
        </button>
      </div>
    </div>
  );
}

function PadButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-surface-2 text-3xl font-light transition active:bg-rose/40"
    >
      {children}
    </button>
  );
}
