import { redirect } from 'next/navigation';
import { getActiveSession, getViewer } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Root() {
  const viewer = await getViewer();
  if (!viewer) redirect('/auth/sign-in');
  if (!viewer.profile?.sex || !viewer.profile.adultConsentAt) redirect('/onboarding');
  if (!viewer.profile.coupleId) redirect('/pair');
  // Reopening the app mid-session lands straight back on the running timer.
  const active = await getActiveSession(viewer.profile.coupleId);
  redirect(active ? '/timer' : '/home');
}
