import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Non-generic and keyed on (path, cookie) so React can dedupe it per request —
 * e.g. the (app) layout and the Workspace Settings page both read
 * `/workspaces/me`. `fetch`'s own memoization doesn't cover `no-store`.
 */
const fetchJson = cache(async (path: string, cookie: string): Promise<unknown> => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

/**
 * Server-side GET against the NestJS API, forwarding the incoming session
 * cookie so the API's AuthGuard sees the caller. Mirrors `getSession()` in
 * session.ts. Returns `null` on any non-OK response or network error.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  const cookie = (await headers()).get('cookie') ?? '';
  return (await fetchJson(path, cookie)) as T | null;
}
