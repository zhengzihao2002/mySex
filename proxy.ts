import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';
import { configProblems } from '@/lib/env';

// Refreshes the Neon Auth session and bounces signed-out visitors to the sign-in page.
export default async function proxy(request: NextRequest) {
  // A misconfigured deployment shows a setup checklist instead of a blank 500.
  if (configProblems().length) {
    return NextResponse.rewrite(new URL('/setup', request.url));
  }
  try {
    return await getAuth().middleware({ loginUrl: '/auth/sign-in' })(request);
  } catch (error) {
    // Don't take every page down if Neon Auth hiccups; pages re-check the session themselves.
    console.error('[proxy] auth middleware failed', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|auth/|setup|_next/static|_next/image|favicon.ico|icon|apple-icon|icons/|manifest.webmanifest).*)',
  ],
};
