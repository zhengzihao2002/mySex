'use client';
import { useT } from '@/components/I18nProvider';

import { MonitorSmartphone } from 'lucide-react';
import { signOutDevice, signOutOtherDevices } from '@/app/actions';
import { FormError } from '@/components/FormError';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { flagEmoji } from '@/lib/content';
import type { Device } from '@/lib/devices';
import { describeDevice } from '@/lib/ua';

function place(d: { city: string | null; region: string | null; country: string | null }, unknown = 'Unknown location') {
  return [d.city, d.region, d.country].filter(Boolean).join(', ') || unknown;
}

function ago(iso: string, t: (k: string, v?: Record<string, number>) => string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 15) return t('Active now');
  if (min < 60) return t('Active {n} min ago', { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t('Active {n}h ago', { n: h });
  return t('Active {n}d ago', { n: Math.round(h / 24) });
}

export function DevicesSection({ devices, currentId }: { devices: Device[]; currentId: string | null }) {
  const { t, f } = useT();
  const { tz } = useTz();
  const { run, pending, error } = useRun();
  const others = devices.filter((d) => d.deviceId !== currentId && !d.revokedAt);

  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <MonitorSmartphone size={18} /> {t('Devices & logins')}
      </h2>
      <p className="text-xs text-ink-3">{t('Everywhere your account is signed in. Location comes from the device’s IP address.')}</p>

      <div className="space-y-2">
        {[...devices].sort((a, b) => Number(b.deviceId === currentId) - Number(a.deviceId === currentId)).map((d) => {
          const { icon, label } = describeDevice(d.userAgent);
          const isThis = d.deviceId === currentId;
          return (
            <div key={d.deviceId} className={`flex items-center gap-3 rounded-2xl bg-surface-2 p-3 ${d.revokedAt ? 'opacity-50' : ''}`}>
              <span className="text-2xl">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {label}
                  {isThis && <span className="rounded-full bg-follicular/30 px-2 py-0.5 text-[10px] font-bold text-ink">{t('This device')}</span>}
                </p>
                <p className="truncate text-xs text-ink-2">
                  {flagEmoji(d.country)} {place(d, t('Unknown location'))}
                  {d.ip ? ` · ${d.ip}` : ''}
                </p>
                <p className="text-[11px] text-ink-3" suppressHydrationWarning>
                  {d.revokedAt ? t('Signed out {date}', { date: f.dateTimeInTz(d.revokedAt, tz) }) : isThis ? t('Active now') : ago(d.lastSeen, t)} ·{' '}
                  {t('signed in {date}', { date: f.dateTimeInTz(d.signedInAt, tz) })}
                </p>
              </div>
              {!isThis && !d.revokedAt && (
                <button className="chip shrink-0 text-menstrual" disabled={pending} onClick={() => run(() => signOutDevice(d.deviceId))}>
                  {t('Sign out')}
                </button>
              )}
            </div>
          );
        })}
        {!devices.length && <p className="text-sm text-ink-3">{t('No devices recorded yet — they appear after your next sign-in.')}</p>}
      </div>

      {others.length > 0 && (
        <button className="btn-ghost w-full text-menstrual" disabled={pending} onClick={() => run(() => signOutOtherDevices())}>
          {t('Sign out all other devices')}
        </button>
      )}
      <FormError error={error} />
    </section>
  );
}
