# apps/

Monorepo applications (npm workspaces). Code in English, product content in Spanish
(see [`../CONTRIBUTING.md`](../CONTRIBUTING.md)).

## `apps/api` — backend (Hono on Vercel Functions + Supabase)
Layered architecture with an isolated domain (Clean/Hexagonal, simplified):

```
api/index.ts          Vercel Function entry (Hono app, routes under /api/v1)
src/
  config/             Config singleton (loads config/app.config.yml, validates with Zod)
  domain/             Pure business entities and rules (no framework) — from Block 1
  application/        Use cases orchestrating domain + repositories — from Block 3
  infrastructure/     Concrete adapters: Supabase client, repositories, notifications
  interfaces/http/v1/ HTTP controllers (versioned) — from Block 3
  shared/             Common types, errors, utilities
tests/                Vitest
```

## `apps/web` — frontend (Next.js App Router PWA)
```
app/                  App Router (layout, pages)
src/
  features/           intake, psychologist-portal, coordinator-panel — from Block 6
  components/         Shared presentational components
  lib/                Client utilities
  styles/             Global styles
tests/                Vitest + Testing Library
```

## Commands (from the repo root)
- `npm install` — install all workspaces.
- `npm run type-check` — TypeScript across workspaces.
- `npm run test` — Vitest in `api` and `web`.
- `npm run build` — `tsc` (api) and `next build` (web).
