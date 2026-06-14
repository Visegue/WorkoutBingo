# Task Bingo Agent Guide

## Purpose

Task Bingo is a Next.js app for soccer teams to complete shared summer task bingo boards. Leaders create teams, bingo boards, tasks, and invite codes. Members (players/kids) are pre-created by leaders. Boards are publicly accessible via slug URLs — anyone can check off tasks for any member (trusted community model).

## Stack

- Next.js 16 App Router + TypeScript
- Mantine 9 UI + @tabler/icons-react
- Tailwind 4
- Supabase Auth, Postgres, RLS
- Zod 4 for validation
- Bun package manager
- Vercel hosting target

## Commands

- Install: `bun install`
- Dev: `bun run dev`
- Lint: `bun run lint`
- Type-check: `bun run typecheck`
- Build: `bun run build`

## Environment

Copy `.env.example` to `.env.local` and fill Supabase values. Never commit real secrets.

## Architecture Notes

- Server actions live in `src/app/actions.ts` and must authenticate/authorize before mutation.
- Public board access is unauthenticated — RLS grants anon select on boards/cells/tasks/members and insert/delete on cell_checks for boards with a slug.
- Supabase RLS is defined across `supabase/migrations/0001_initial_schema.sql` through `0006_member_colors.sql`.
- Generated bingo board cells are persisted in `board_cells`; never randomize on read.
- Active bingo board reset/regeneration deletes checks and cells, then writes a new randomized layout.
- Client-safe shared code goes in `src/lib/constants.ts` (no server imports). Server-only helpers in `src/lib/domain.ts`.
- Public board page `/b/[slug]` uses the `PublicBingoGrid` client component for interactivity.
- Public check/uncheck API at `/api/boards/[slug]/check` (POST/DELETE, no auth).
- Members have a `color` field (hex) for avatar badges; auto-assigned from a 36-color palette on creation, changeable by leaders.

## Key Patterns

- Forms use native `<form action={serverAction}>` with hidden inputs for IDs.
- Client components that need interactivity (modals, inline editing) import server actions directly.
- Mantine modals in client components should use `withinPortal={false}` to ensure form actions work with Next.js.
- Member badges on the bingo grid use plain `<div>` elements (not Mantine Avatar) to avoid style interference.

## Definition Of Done

- Relevant UI works on desktop and mobile.
- `lint`, `typecheck`, and `build` pass.
- Database changes include a migration and RLS policies.
- Swedish UI text, English code/comments.
