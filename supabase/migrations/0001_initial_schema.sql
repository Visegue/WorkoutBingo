create extension if not exists pgcrypto;
create schema if not exists private;

create type public.team_role as enum ('leader', 'kid');
create type public.board_status as enum ('draft', 'active');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.team_role not null default 'kid',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  width integer not null check (width between 2 and 10),
  height integer not null check (height between 2 and 10),
  status public.board_status not null default 'draft',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  generated_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null,
  description text,
  appearance_count integer not null check (appearance_count > 0),
  created_at timestamptz not null default now()
);

create table public.board_cells (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (board_id, position)
);

create table public.cell_checks (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.board_cells(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cell_id, user_id)
);

create index team_members_user_id_idx on public.team_members(user_id);
create index teams_created_by_idx on public.teams(created_by);
create index team_invites_team_id_idx on public.team_invites(team_id);
create index team_invites_created_by_idx on public.team_invites(created_by);
create index boards_team_id_idx on public.boards(team_id);
create index boards_created_by_idx on public.boards(created_by);
create index tasks_board_id_idx on public.tasks(board_id);
create index board_cells_board_id_idx on public.board_cells(board_id);
create index board_cells_task_id_idx on public.board_cells(task_id);
create index cell_checks_cell_id_idx on public.cell_checks(cell_id);
create index cell_checks_user_id_idx on public.cell_checks(user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.teams to authenticated;
grant select, insert, update, delete on table public.team_members to authenticated;
grant select, insert, update, delete on table public.team_invites to authenticated;
grant select, insert, update, delete on table public.boards to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.board_cells to authenticated;
grant select, insert, update, delete on table public.cell_checks to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.boards enable row level security;
alter table public.tasks enable row level security;
alter table public.board_cells enable row level security;
alter table public.cell_checks enable row level security;

create function private.is_team_member(target_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = target_team_id and user_id = auth.uid()
  );
$$;

create function private.is_team_leader(target_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = target_team_id and user_id = auth.uid() and role = 'leader'
  );
$$;

revoke execute on function private.is_team_member(uuid) from public, anon;
revoke execute on function private.is_team_leader(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.is_team_leader(uuid) to authenticated;

create policy "profiles select own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "teams select members or creator" on public.teams for select to authenticated using (created_by = (select auth.uid()) or private.is_team_member(id));
create policy "teams insert own" on public.teams for insert to authenticated with check (created_by = (select auth.uid()));
create policy "teams update leaders" on public.teams for update to authenticated using (private.is_team_leader(id));

create policy "members select team" on public.team_members for select to authenticated using (private.is_team_member(team_id));
create policy "members insert self or leader" on public.team_members for insert to authenticated with check (user_id = (select auth.uid()) or private.is_team_leader(team_id));
create policy "members update leaders" on public.team_members for update to authenticated using (private.is_team_leader(team_id));

create policy "invites select leaders or active" on public.team_invites for select to authenticated using (private.is_team_leader(team_id) or revoked_at is null);
create policy "invites insert leaders" on public.team_invites for insert to authenticated with check (private.is_team_leader(team_id) and created_by = (select auth.uid()));
create policy "invites update leaders" on public.team_invites for update to authenticated using (private.is_team_leader(team_id));

create policy "boards select members" on public.boards for select to authenticated using (private.is_team_member(team_id));
create policy "boards insert leaders" on public.boards for insert to authenticated with check (private.is_team_leader(team_id) and created_by = (select auth.uid()));
create policy "boards update leaders" on public.boards for update to authenticated using (private.is_team_leader(team_id));
create policy "boards delete leaders" on public.boards for delete to authenticated using (private.is_team_leader(team_id));

create policy "tasks select members" on public.tasks for select to authenticated using (
  exists (select 1 from public.boards where boards.id = tasks.board_id and private.is_team_member(boards.team_id))
);
create policy "tasks insert leaders" on public.tasks for insert to authenticated with check (
  exists (select 1 from public.boards where boards.id = tasks.board_id and private.is_team_leader(boards.team_id))
);
create policy "tasks update leaders" on public.tasks for update to authenticated using (
  exists (select 1 from public.boards where boards.id = tasks.board_id and private.is_team_leader(boards.team_id))
) with check (
  exists (select 1 from public.boards where boards.id = tasks.board_id and private.is_team_leader(boards.team_id))
);
create policy "tasks delete leaders" on public.tasks for delete to authenticated using (
  exists (select 1 from public.boards where boards.id = tasks.board_id and private.is_team_leader(boards.team_id))
);

create policy "cells select members" on public.board_cells for select to authenticated using (
  exists (select 1 from public.boards where boards.id = board_cells.board_id and private.is_team_member(boards.team_id))
);
create policy "cells insert leaders" on public.board_cells for insert to authenticated with check (
  exists (select 1 from public.boards where boards.id = board_cells.board_id and private.is_team_leader(boards.team_id))
);
create policy "cells update leaders" on public.board_cells for update to authenticated using (
  exists (select 1 from public.boards where boards.id = board_cells.board_id and private.is_team_leader(boards.team_id))
) with check (
  exists (select 1 from public.boards where boards.id = board_cells.board_id and private.is_team_leader(boards.team_id))
);
create policy "cells delete leaders" on public.board_cells for delete to authenticated using (
  exists (select 1 from public.boards where boards.id = board_cells.board_id and private.is_team_leader(boards.team_id))
);

create policy "checks select members" on public.cell_checks for select to authenticated using (
  exists (
    select 1 from public.board_cells
    join public.boards on boards.id = board_cells.board_id
    where board_cells.id = cell_checks.cell_id and private.is_team_member(boards.team_id)
  )
);
create policy "checks insert own member" on public.cell_checks for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.board_cells
    join public.boards on boards.id = board_cells.board_id
    where board_cells.id = cell_checks.cell_id and private.is_team_member(boards.team_id)
  )
);
create policy "checks delete own or leader" on public.cell_checks for delete to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.board_cells
    join public.boards on boards.id = board_cells.board_id
    where board_cells.id = cell_checks.cell_id and private.is_team_leader(boards.team_id)
  )
);
