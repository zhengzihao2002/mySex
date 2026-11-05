import { getFontPreferences } from '@/lib/font-preferences-server';
import { requireCouple } from '@/lib/data';
import { currentDeviceId, getDevices } from '@/lib/devices';
import { DevicesSection } from './DevicesSection';
import { SettingsView } from './SettingsView';

export const metadata = { title: 'Settings · mySex' };

export default async function SettingsPage() {
  const ctx = await requireCouple();
  const [devices, current, fonts] = await Promise.all([getDevices(ctx.me.userId), currentDeviceId(), getFontPreferences()]);
  return (
    <SettingsView
      fonts={fonts}
      me={ctx.me}
      partner={ctx.partner}
      anniversary={ctx.couple.anniversary}
      pairedSince={ctx.couple.createdAt.slice(0, 10)}
      devices={<DevicesSection devices={devices} currentId={current} />}
    />
  );
}
