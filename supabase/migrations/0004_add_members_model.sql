-- =============================================================
-- Migration: Introduce "members" concept (physical players)
-- Multiple user accounts can be linked to one member.
-- cell_checks now reference members, not user accounts.
-- team_invites gain a role column.
-- =============================================================

-- 1. Add role column to team_invites
alter table public.team_invites
  add column role public.team_role not null default 'kid';

-- 2. Create members table
create table public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  display_name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, display_name)
);

create index members_team_id_idx on public.members(team_id);
create index members_created_by_idx on public.members(created_by);

-- 3. Create member_accounts junction table
create table public.member_accounts (
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, user_id)
);

create index member_accounts_user_id_idx on public.member_accounts(user_id);

-- 4. Recreate cell_checks with member_id instead of user_id
drop table public.cell_checks;

create table public.cell_checks (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.board_cells(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cell_id, member_id)
);

create index cell_checks_cell_id_idx on public.cell_checks(cell_id);
create index cell_checks_member_id_idx on public.cell_checks(member_id);

-- 5. Grant access to authenticated role
grant select, insert, update, delete on table public.members to authenticated;
grant select, insert, update, delete on table public.member_accounts to authenticated;
grant select, insert, update, delete on table public.cell_checks to authenticated;

-- 6. Enable RLS
alter table public.members enable row level security;
alter table public.member_accounts enable row level security;
alter table public.cell_checks enable row level security;

-- 7. RLS policies for members
create policy "members select team" on public.members
  for select to authenticated
  using (private.is_team_member(team_id));

create policy "members insert team member" on public.members
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      private.is_team_leader(team_id)
      or private.is_team_member(team_id)
    )
  );

create policy "members update leaders" on public.members
  for update to authenticated
  using (private.is_team_leader(team_id))
  with check (private.is_team_leader(team_id));

create policy "members delete leaders" on public.members
  for delete to authenticated
  using (private.is_team_leader(team_id));

-- 8. RLS policies for member_accounts
create policy "member_accounts select team" on public.member_accounts
  for select to authenticated
  using (
    exists (
      select 1 from public.members
      where members.id = member_accounts.member_id
        and private.is_team_member(members.team_id)
    )
  );

create policy "member_accounts insert leader or self" on public.member_accounts
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and exists (
      select 1 from public.members
      where members.id = member_accounts.member_id
        and private.is_team_member(members.team_id)
    ))
    or
    exists (
      select 1 from public.members
      where members.id = member_accounts.member_id
        and private.is_team_leader(members.team_id)
    )
  );

create policy "member_accounts delete leaders" on public.member_accounts
  for delete to authenticated
  using (
    exists (
      select 1 from public.members
      where members.id = member_accounts.member_id
        and private.is_team_leader(members.team_id)
    )
  );

-- 9. RLS policies for cell_checks (now member-based)
create policy "checks select members" on public.cell_checks
  for select to authenticated
  using (
    exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and private.is_team_member(boards.team_id)
    )
  );

create policy "checks insert linked member" on public.cell_checks
  for insert to authenticated
  with check (
    exists (
      select 1 from public.member_accounts
      where member_accounts.member_id = cell_checks.member_id
        and member_accounts.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and private.is_team_member(boards.team_id)
    )
  );

create policy "checks delete linked or leader" on public.cell_checks
  for delete to authenticated
  using (
    exists (
      select 1 from public.member_accounts
      where member_accounts.member_id = cell_checks.member_id
        and member_accounts.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and private.is_team_leader(boards.team_id)
    )
  );
