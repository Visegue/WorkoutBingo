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

For this project, local development normally uses the hosted Supabase project.
Fill `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase

1. Create a Supabase project, or use the hosted dev project above.
2. Run all migrations in `supabase/migrations/` in order (0001 through 0006) via the SQL editor or Supabase CLI.
3. Enable Auth providers:
   - Email magic links
   - Google OAuth
4. Add redirect URL: `http://localhost:3000/auth/callback`.
5. For Vercel, add redirect URLs for production and previews:
   - `https://your-domain.com/auth/callback`
   - `https://*-your-project.vercel.app/auth/callback`
6. Fill `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The Supabase CLI is optional for hosted local development. Install it only if you
want to run a fully local Supabase stack or manage linked project migrations.

## Agent Setup

Local opencode/Supabase MCP settings are intentionally not committed. If you use
opencode with Supabase MCP, create a local `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "supabase": {
      "type": "remote",
      "url": "https://mcp.supabase.com/mcp?project_ref=your-project-ref",
      "enabled": true
    }
  }
}
```

Local agent skills are also intentionally not committed. Install or update the
Supabase skills locally with:

```bash
npx skills add supabase/agent-skills
```

Install or update the local Vercel opencode plugin with:

```bash
npx plugins add vercel/vercel-plugin
```

## Validation

```bash
bun run lint
bun run typecheck
bun run build
```

## Deployment

Deploy to Vercel with the Next.js preset and Bun install/build commands. Set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

For production/custom domains, also set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

For Vercel preview deployments, omit `NEXT_PUBLIC_SITE_URL`; the app falls back
to Vercel's `VERCEL_URL` automatically.
