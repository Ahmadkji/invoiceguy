# TimeProof (InvoiceGuy)

MVP invoicing app built with Next.js App Router.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file and set your Supabase project values:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

3. Run local dev server:

```bash
npm run dev
```

## Supabase Setup

This repo includes these migrations:

- `supabase/migrations/20260426173000_auth_profiles.sql`
- `supabase/migrations/20260426174500_phase2_core_schema.sql`

Apply migrations with the Supabase CLI (linked project):

```bash
supabase db push
```

Configure Auth URLs in Supabase:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

## Auth Flow

- `src/proxy.ts` protects `/dashboard/*` routes and refreshes Supabase session cookies.
- `src/app/signin/page.tsx` uses real Supabase email/password auth + Google OAuth.
- `src/app/auth/callback/route.ts` exchanges OAuth code for session and redirects back to app.

## Commands

- `npm run dev` - start dev server
- `npm run lint` - run ESLint
- `npx tsc --noEmit` - typecheck
