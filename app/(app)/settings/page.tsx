import { requireCouple } from '@/lib/data';
import { currentDeviceId, getDevices, getLoginEvents } from '@/lib/devices';
import { DevicesSection } from './DevicesSection';
import { SettingsView } from './SettingsView';

export const metadata = { title: 'Settings · mySex' };

export default async function SettingsPage() {
  const ctx = await requireCouple();
  const [devices, events, current] = await Promise.all([getDevices(ctx.me.userId), getLoginEvents(ctx.me.userId), currentDeviceId()]);
  return (
    <SettingsView
      me={ctx.me}
      partner={ctx.partner}
      anniversary={ctx.couple.anniversary}
      pairedSince={ctx.couple.createdAt.slice(0, 10)}
      devices={<DevicesSection devices={devices} events={events} currentId={current} />}
    />
  );
}
