import { requireCouple } from '@/lib/data';
import { SettingsView } from './SettingsView';

export const metadata = { title: 'Settings · mySex' };

export default async function SettingsPage() {
  const ctx = await requireCouple();
  return <SettingsView me={ctx.me} partner={ctx.partner} anniversary={ctx.couple.anniversary} pairedSince={ctx.couple.createdAt.slice(0, 10)} />;
}
