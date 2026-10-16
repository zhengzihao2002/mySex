import { getActiveSession, getUnreadCount, requireCouple } from '@/lib/data';
import { TabBar } from '@/components/TabBar';
import { PinLock } from '@/components/PinLock';
import { RefreshOnFocus } from '@/components/RefreshOnFocus';
import { TzProvider } from '@/components/TzProvider';
import { getToday } from '@/lib/today';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCouple();
  const [{ tz, today }, unread, active] = await Promise.all([
    getToday(),
    getUnreadCount(ctx.couple.id, ctx.me.userId),
    getActiveSession(ctx.couple.id),
  ]);
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
