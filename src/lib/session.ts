import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
}

export interface Session {
  user: SessionUser;
  session: { id: string; userId: string; expiresAt: string };
}

/**
 * Keyed on the cookie so React dedupes it per request — the (app) layout and
 * the page under it both call getSession() on a full page load.
 */
const loadSession = cache(async (cookie: string): Promise<Session | null> => {
  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Session | null;
    return data?.user ? data : null;
  } catch {
    return null;
  }
});

/**
 * Reads the current session by forwarding the incoming cookies to the NestJS
 * API's Better Auth `get-session` endpoint. Mirrors v2's server-side `/auth/me`
 * fetch. Returns `null` when there is no valid session.
 */
export async function getSession(): Promise<Session | null> {
  const cookie = (await headers()).get('cookie') ?? '';
  if (!cookie) return null;
  return loadSession(cookie);
}
