# Task Bingo

Team-based task bingo for soccer teams during summer breaks.

## Features

- Supabase login with Google OAuth or email magic links
- Leaders create teams, invite codes, and multiple bingo boards per team
- Configurable bingo board width/height
- Tasks can appear multiple times on a randomized bingo board
- Generated bingo boards are stable across devices
- Public board URLs — anyone can check off tasks (trusted community model)
- Members (players) are pre-created by leaders, each with a unique color
- Team progress: a cell is "done" when any member checks it off
- Member badges on cells show who completed each task
- Autofill boards with randomized soccer training tasks

## Tech

- Next.js 16 App Router + TypeScript
- Mantine 9 UI + @tabler/icons-react
- Tailwind 4
- Supabase Auth, Postgres, RLS
- Zod 4
- Bun
- Vercel deployment target

## Setup

```bash
bun install
cp .env.example .env.local
bun run dev
```

## Supabase

1. Create a Supabase project.
2. Run all migrations in `supabase/migrations/` in order (0001 through 0006) via the SQL editor or Supabase CLI.
3. Enable Auth providers:
   - Email magic links
   - Google OAuth
4. Add redirect URL: `http://localhost:3000/auth/callback`.
5. For Vercel, add `https://your-domain.vercel.app/auth/callback`.
6. Fill `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Validation

```bash
bun run lint
bun run typecheck
bun run build
```

## Deployment

Deploy to Vercel and set the same environment variables. Connect the GitHub repo after creating/pushing it.
