do $$
begin
  if to_regclass('public.workouts') is not null and to_regclass('public.tasks') is null then
    alter table public.workouts rename to tasks;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'board_cells' and column_name = 'workout_id'
  ) then
    alter table public.board_cells rename column workout_id to task_id;
  end if;

  if to_regclass('public.workouts_pkey') is not null then
    alter index public.workouts_pkey rename to tasks_pkey;
  end if;

  if to_regclass('public.workouts_board_id_idx') is not null then
    alter index public.workouts_board_id_idx rename to tasks_board_id_idx;
  end if;

  if to_regclass('public.board_cells_workout_id_idx') is not null then
    alter index public.board_cells_workout_id_idx rename to board_cells_task_id_idx;
  end if;

  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public' and table_name = 'board_cells' and constraint_name = 'board_cells_workout_id_fkey'
  ) then
    alter table public.board_cells rename constraint board_cells_workout_id_fkey to board_cells_task_id_fkey;
  end if;

  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public' and table_name = 'tasks' and constraint_name = 'workouts_board_id_fkey'
  ) then
    alter table public.tasks rename constraint workouts_board_id_fkey to tasks_board_id_fkey;
  end if;
end $$;

grant select, insert, update, delete on table public.tasks to authenticated;

drop policy if exists "workouts select members" on public.tasks;
drop policy if exists "workouts insert leaders" on public.tasks;
drop policy if exists "workouts update leaders" on public.tasks;
drop policy if exists "workouts delete leaders" on public.tasks;
drop policy if exists "tasks select members" on public.tasks;
drop policy if exists "tasks insert leaders" on public.tasks;
drop policy if exists "tasks update leaders" on public.tasks;
drop policy if exists "tasks delete leaders" on public.tasks;

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
