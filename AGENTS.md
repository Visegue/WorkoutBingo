# Task Bingo Agent Guide

## Purpose

Task Bingo is a Next.js app for soccer teams to complete shared summer task bingo boards. Leaders create teams, bingo boards, tasks, and invite codes. Kids join teams, view generated bingo boards, and check/uncheck their own cells.

## Stack

- Next.js App Router + TypeScript
- Mantine UI
- Supabase Auth, Postgres, RLS
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

- Server Functions live in `src/app/actions.ts` and must authenticate/authorize before mutation.
- Supabase RLS is defined in `supabase/migrations/0001_initial_schema.sql`.
- Generated bingo board cells are persisted in `board_cells`; never randomize on read.
- Active bingo board reset/regeneration deletes checks and cells, then writes a new randomized layout.

## Definition Of Done

- Relevant UI works on desktop and mobile.
- `lint`, `typecheck`, and `build` pass.
- Database changes include a migration and RLS policies.
