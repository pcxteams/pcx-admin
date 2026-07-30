import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Better Auth's default session cookie (with the `__Secure-` prefix used over
// HTTPS). This is an optimistic presence check only; the real validation
// happens in the (app) layout via getSession(). Mirrors v2's proxy.ts.
const SESSION_COOKIE = 'better-auth.session_token';

function isPublic(pathname: string): boolean {
  if (pathname === '/login') return true;
  // Setup form page and its backing API endpoints are public — no session required.
  if (pathname.startsWith('/setup/')) return true;
  if (pathname.startsWith('/api/workspace-setup/')) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Inject the pathname so server layouts can read it via headers().
  // Used by (app)/layout.tsx to skip auth for /setup/* if the catch-all
  // route group happens to intercept those public paths.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const hasSession = Boolean(
    request.cookies.get(SESSION_COOKIE)?.value ??
      request.cookies.get(`__Secure-${SESSION_COOKIE}`)?.value,
  );

  if (!hasSession && !isPublic(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Deliberately NO `/login -> /` bounce on cookie presence. The cookie is only
  // checked for existence here, not validity. If we redirected an
  // authenticated-looking request away from /login and the (app) layout's
  // getSession() then rejected a stale/expired/revoked cookie (or the API was
  // briefly unreachable), the two guards would ping-pong forever
  // (ERR_TOO_MANY_REDIRECTS), hard-locking the user out. Always letting /login
  // render lets a user with a dead session sign in again.
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on everything except Next internals, the auth API (which must stay
  // reachable while signed out so sign-in works), and any path containing a
  // file extension, i.e. public/ assets (images, robots.txt, manifest.json).
  // Next 16 Proxy runs on those by default and would otherwise redirect them
  // to /login for logged-out visitors, breaking asset loading.
  matcher: ['/((?!api/auth|_next/static|_next/image|.*\\..*).*)'],
};
