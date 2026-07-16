'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Browser-side Better Auth client. With no `baseURL`, Better Auth uses the
 * current browser origin, so requests hit `/api/auth/*` on this app and are
 * proxied to the NestJS API by a Next.js rewrite (see next.config.ts), which
 * keeps the session cookie first-party. We deliberately do NOT set a hardcoded
 * `baseURL`: `NEXT_PUBLIC_*` values are inlined at build time, so a build
 * without it set would ship a localhost URL to every user's browser and break
 * sign-in in production.
 */
export const authClient = createAuthClient();
