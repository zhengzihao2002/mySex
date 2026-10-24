import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';
import { configProblems } from '@/lib/env';

const DEVICE_COOKIE = 'mysex_device'; // see lib/devices.ts

// Gives every browser a stable device id so Settings can list where you're signed in.
function withDeviceCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.get(DEVICE_COOKIE)) {
    response.cookies.set(DEVICE_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}

// Refreshes the Neon Auth session and bounces signed-out visitors to the sign-in page.
export default async function proxy(request: NextRequest) {
  // A misconfigured deployment shows a setup checklist instead of a blank 500.
  if (configProblems().length) {
    return NextResponse.rewrite(new URL('/setup', request.url));
  }
  try {
    const response = await getAuth().middleware({ loginUrl: '/auth/sign-in' })(request);
    return withDeviceCookie(request, response);
  } catch (error) {
    // Don't take every page down if Neon Auth hiccups; pages re-check the session themselves.
    console.error('[proxy] auth middleware failed', error);
    return withDeviceCookie(request, NextResponse.next());
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|api/maintenance/retention|auth/|setup|_next/static|_next/image|favicon.ico|icon|apple-icon|icons/|manifest.webmanifest).*)',
  ],
};
