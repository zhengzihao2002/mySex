import { getActiveSession, getUnreadCount, requireCouple } from '@/lib/data';
import { TabBar } from '@/components/TabBar';
import { PinLock } from '@/components/PinLock';
import { RefreshOnFocus } from '@/components/RefreshOnFocus';
import { TzProvider } from '@/components/TzProvider';
import { getToday } from '@/lib/today';
import { touchDevice } from '@/lib/devices';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCouple();
  const [{ tz, today }, unread, active, device] = await Promise.all([
    getToday(),
    getUnreadCount(ctx.couple.id, ctx.me.userId),
    getActiveSession(ctx.couple.id),
    touchDevice(ctx.me.userId),
  ]);
  // This device was signed out remotely from Settings → Devices.
  if (device.revoked) redirect('/auth/revoked');
  return (
    <TzProvider tz={tz} today={today}>
    <PinLock>
      <RefreshOnFocus />
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-safe pb-[calc(env(safe-area-inset-bottom)+96px)]">{children}</div>
      <TabBar unread={unread} live={!!active} />
    </PinLock>
    </TzProvider>
  );
}
