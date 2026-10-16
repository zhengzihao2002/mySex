import type { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';

// Refreshes the Neon Auth session and bounces signed-out visitors to the sign-in page.
export default function proxy(request: NextRequest) {
  return getAuth().middleware({ loginUrl: '/auth/sign-in' })(request);
}

export const config = {
  matcher: [
    '/((?!api/auth|auth/|welcome|_next/static|_next/image|favicon.ico|icon|apple-icon|icons/|manifest.webmanifest).*)',
  ],
};
