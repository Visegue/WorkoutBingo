-- =============================================================
-- Migration: Open boards with slug URLs
-- - Drop member_accounts (no user-account-to-member linking needed)
-- - Add slug to boards for public URLs
-- - Remove role from team_invites (invites are leader-only now)
-- - Update RLS: grant anon access to boards, cells, tasks, members, cell_checks
-- - cell_checks INSERT/DELETE open to anon (trusted community)
-- =============================================================

-- 1. Drop cell_checks policies that depend on member_accounts
drop policy if exists "checks insert linked member" on public.cell_checks;
drop policy if exists "checks delete linked or leader" on public.cell_checks;
drop policy if exists "checks select members" on public.cell_checks;

-- 2. Drop member_accounts table
drop table if exists public.member_accounts;

-- 3. Add slug column to boards
alter table public.boards
  add column slug text;

-- Create unique index on slug (partial - only non-null)
create unique index boards_slug_idx on public.boards(slug) where slug is not null;

-- 4. Remove role column from team_invites
alter table public.team_invites
  drop column if exists role;

-- 5. Grant anon access to tables needed for public board view
grant usage on schema public to anon;
grant select on table public.boards to anon;
grant select on table public.board_cells to anon;
grant select on table public.tasks to anon;
grant select on table public.members to anon;
grant select, insert, delete on table public.cell_checks to anon;

-- 6. RLS policies for public (anon) access

-- boards: anon can select by slug
create policy "boards select public by slug" on public.boards
  for select to anon
  using (slug is not null);

-- board_cells: anon can select if board has slug
create policy "cells select public" on public.board_cells
  for select to anon
  using (
    exists (
      select 1 from public.boards
      where boards.id = board_cells.board_id
        and boards.slug is not null
    )
  );

-- tasks: anon can select if board has slug
create policy "tasks select public" on public.tasks
  for select to anon
  using (
    exists (
      select 1 from public.boards
      where boards.id = tasks.board_id
        and boards.slug is not null
    )
  );

-- members: anon can select if team has a board with slug
create policy "members select public" on public.members
  for select to anon
  using (
    exists (
      select 1 from public.boards
      where boards.team_id = members.team_id
        and boards.slug is not null
    )
  );

-- cell_checks: open access for public boards
create policy "checks select public" on public.cell_checks
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and boards.slug is not null
    )
  );

create policy "checks insert public" on public.cell_checks
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and boards.slug is not null
    )
  );

create policy "checks delete public" on public.cell_checks
  for delete to anon, authenticated
  using (
    exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and boards.slug is not null
    )
  );

-- Also allow authenticated team members to see checks on non-public boards (draft view)
create policy "checks select team members" on public.cell_checks
  for select to authenticated
  using (
    exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and private.is_team_member(boards.team_id)
    )
  );
