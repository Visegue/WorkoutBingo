create schema if not exists private;

create index if not exists teams_created_by_idx on public.teams(created_by);
create index if not exists team_invites_team_id_idx on public.team_invites(team_id);
create index if not exists team_invites_created_by_idx on public.team_invites(created_by);
create index if not exists boards_created_by_idx on public.boards(created_by);
create index if not exists board_cells_task_id_idx on public.board_cells(task_id);
create index if not exists cell_checks_user_id_idx on public.cell_checks(user_id);

do $$
begin
  if to_regprocedure('public.is_team_member(uuid)') is not null then
    alter function public.is_team_member(uuid) set schema private;
  end if;

  if to_regprocedure('public.is_team_leader(uuid)') is not null then
    alter function public.is_team_leader(uuid) set schema private;
  end if;
end $$;

revoke execute on function private.is_team_member(uuid) from public, anon;
revoke execute on function private.is_team_leader(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.is_team_leader(uuid) to authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

drop policy if exists "tasks mutate leaders" on public.tasks;
drop policy if exists "tasks insert leaders" on public.tasks;
drop policy if exists "tasks update leaders" on public.tasks;
drop policy if exists "tasks delete leaders" on public.tasks;
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

drop policy if exists "cells mutate leaders" on public.board_cells;
drop policy if exists "cells insert leaders" on public.board_cells;
drop policy if exists "cells update leaders" on public.board_cells;
drop policy if exists "cells delete leaders" on public.board_cells;
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
