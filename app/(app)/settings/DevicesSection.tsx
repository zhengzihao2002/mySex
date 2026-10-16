'use client';

import { useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { signOutDevice, signOutOtherDevices } from '@/app/actions';
import { FormError } from '@/components/FormError';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { flagEmoji } from '@/lib/content';
import type { Device, LoginEvent } from '@/lib/devices';
import { dateTimeInTz } from '@/lib/tz';
import { describeDevice } from '@/lib/ua';

function place(d: { city: string | null; region: string | null; country: string | null }) {
  return [d.city, d.region, d.country].filter(Boolean).join(', ') || 'Unknown location';
}

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 15) return 'Active now';
  if (min < 60) return `Active ${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `Active ${h}h ago`;
  return `Active ${Math.round(h / 24)}d ago`;
}

export function DevicesSection({ devices, events, currentId }: { devices: Device[]; events: LoginEvent[]; currentId: string | null }) {
  const { tz } = useTz();
  const { run, pending, error } = useRun();
  const [showHistory, setShowHistory] = useState(false);
  const others = devices.filter((d) => d.deviceId !== currentId && !d.revokedAt);

  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <MonitorSmartphone size={18} /> Devices & logins
      </h2>
      <p className="text-xs text-ink-3">Everywhere your account is signed in. Location comes from the device’s IP address.</p>

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
                  {isThis && <span className="rounded-full bg-follicular/30 px-2 py-0.5 text-[10px] font-bold text-ink">This device</span>}
                </p>
                <p className="truncate text-xs text-ink-2">
                  {flagEmoji(d.country)} {place(d)}
                  {d.ip ? ` · ${d.ip}` : ''}
                </p>
                <p className="text-[11px] text-ink-3" suppressHydrationWarning>
                  {d.revokedAt ? `Signed out ${dateTimeInTz(d.revokedAt, tz)}` : isThis ? 'Active now' : ago(d.lastSeen)} · signed in{' '}
                  {dateTimeInTz(d.signedInAt, tz)}
                </p>
              </div>
              {!isThis && !d.revokedAt && (
                <button className="chip shrink-0 text-menstrual" disabled={pending} onClick={() => run(() => signOutDevice(d.deviceId))}>
                  Sign out
                </button>
              )}
            </div>
          );
        })}
        {!devices.length && <p className="text-sm text-ink-3">No devices recorded yet — they appear after your next sign-in.</p>}
      </div>

      {others.length > 0 && (
        <button className="btn-ghost w-full text-menstrual" disabled={pending} onClick={() => run(() => signOutOtherDevices())}>
          Sign out all other devices
        </button>
      )}
      <FormError error={error} />

      {events.length > 0 && (
        <div>
          <button className="text-sm font-semibold text-rose-2" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide' : 'Show'} recent sign-ins ({events.length})
          </button>
          {showHistory && (
            <div className="mt-2 divide-y divide-line/60">
              {events.map((e) => (
                <div key={e.id} className="py-2 text-xs">
                  <p className="text-ink">
                    {dateTimeInTz(e.at, tz)} · {describeDevice(e.userAgent).label}
                  </p>
                  <p className="text-ink-3">
                    {flagEmoji(e.country)} {place(e)}
                    {e.ip ? ` · IP ${e.ip}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
