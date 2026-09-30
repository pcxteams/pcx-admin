# PCx Admin v2 (`pcx-admin`)

Admin frontend for PCx V2. Next.js 16 app used by PCx Admins, Managers, and Leaders to manage workspaces, users, teams, content, the Agent Office page, communications, and platform settings. It also serves the public token flows (account activation, workspace setup, vendor form).

All data comes from the backend API (`pcx-api-v2`). For how this repo fits with the other two, see [ARCHITECTURE.md in the API repo](../pcx-api-v2/ARCHITECTURE.md).

## Stack

- **Next.js 16** (App Router) with **React 19**.
- **Better Auth 1.7.2** browser client (`src/lib/auth-client.ts`).
- **Tailwind** + **lucide-react** icons.

> Note: this project targets Next.js 16, whose APIs and conventions differ from earlier versions. See `AGENTS.md` before changing framework-level code.

## Requirements

- Node 20+ and npm.
- The backend API (`pcx-api-v2`) running and reachable (default `http://localhost:3000`).

## Getting started

```bash
npm install
cp .env.example .env         # set API_URL to your running backend
npm run dev                  # http://localhost:3001
```

Start the backend first (`pcx-api-v2`, port 3000), then this app (port 3001).

## Environment variables

This app intentionally uses a **single** variable. It is complete as shipped in `.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `API_URL` | yes | Base URL of the NestJS API, **server-side only**. The browser never sees it. |

How it is used:
- `next.config.ts` rewrites `/api/auth/:path*` and `/api/:path*` to `${API_URL}`, so the browser talks to same-origin and the server proxies to the API.
- `src/lib/session.ts` reads the session from the API server-side.
- Server components (e.g. `workspaces/page.tsx`) and the public token pages fetch directly from `${API_URL}`.

Because auth is proxied same-origin, the Better Auth browser client needs no `baseURL` and there are no `NEXT_PUBLIC_*` values to configure.

> Minor gotcha for the next dev: two public pages (`setup/[token]/page.tsx`, `vendor-form/[token]/page.tsx`) default `API_URL` to `http://localhost:3001` instead of `:3000`. This only matters if `API_URL` is unset; with `.env` configured it is overridden. Worth aligning to `:3000` for consistency.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port **3001**. |
| `npm run build` | Production build. |
| `npm run start` | Serve the build on port **3001**. |
| `npm run lint` | ESLint. |

There is no test suite in this repo yet.

> Known baseline: a lint error in `WorkspaceSubmissionModal` is pre-existing, not a regression.

## App structure (`src/app/`)

- `(app)/` — authenticated admin surface (workspaces, users, teams, content manager, office-page builder, communications, platform settings, etc.).
- `(public)/` — token-based public flows: `activate/[token]`, `setup/[token]`, `vendor-form/[token]`.
- `login/` — sign-in.
- `src/lib/` — API client (`api.ts`), `session.ts`, `auth-client.ts`, and domain helpers.

## Deploy

Standard Next.js build (`npm run build` then `npm run start`, or a Next-compatible host). The only required runtime config is `API_URL` pointing at the deployed backend. Ensure the backend's `BETTER_AUTH_TRUSTED_ORIGINS` includes this app's public origin.

## Related repos

See [ARCHITECTURE.md](../pcx-api-v2/ARCHITECTURE.md) for ports, data flow, and known scope decisions.
