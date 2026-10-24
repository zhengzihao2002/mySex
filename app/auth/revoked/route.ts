import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/server';
import { cookies } from 'next/headers';
import { DEVICE_COOKIE } from '@/lib/devices';

// Reached when this device was signed out from another device (Settings → Devices).
export async function GET(request: Request) {
  try {
    await getAuth().signOut();
  } catch (e) {
    console.error('[revoked] sign-out failed', e);
  }
  (await cookies()).delete(DEVICE_COOKIE);
  return NextResponse.redirect(new URL('/auth/sign-in?revoked=1', request.url));
}
