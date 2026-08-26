# Ask Larder

Staff onboarding and training for independent Australian hospitality venues — role-specific training modules built from a venue's own SOPs and photos, plus an always-on "Ask Larder" assistant locked to that venue's approved content. See `CLAUDE.md` for full product context, architecture decisions, and design system — read it before making any product or design changes.

## Prerequisites

- Node 20+
- npm
- A Supabase project (schema lives in `supabase/migrations/`)

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in the real values (get the Supabase URL/keys from the project dashboard, or via the Supabase MCP's `get_publishable_keys`/project settings).
3. `npm run dev` and open `http://localhost:3000`.

The Supabase schema is applied directly against the live dev project rather than a local Docker stack (no Docker on this machine) — see `supabase/migrations/` for the SQL, applied via the Supabase MCP's `execute_sql`.

## Testing

`npm run test:isolation` runs the standing multi-tenant isolation test (Build Manual Part C, check 4) against the live Supabase project. Re-run this before venue #2 ever shares an environment with venue #1, and after any RLS policy change.

## Tech stack

Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres/Auth/Storage/pgvector) · Vercel · GitHub. Full rationale in `CLAUDE.md`'s Tech Bible summary.
