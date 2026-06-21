alter table public.boards
  add column end_date date;

drop policy if exists "checks insert public" on public.cell_checks;
drop policy if exists "checks delete public" on public.cell_checks;

create policy "checks insert public" on public.cell_checks
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.board_cells
      join public.boards on boards.id = board_cells.board_id
      where board_cells.id = cell_checks.cell_id
        and boards.slug is not null
        and boards.status = 'active'
        and (boards.end_date is null or boards.end_date > current_date)
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
        and boards.status = 'active'
        and (boards.end_date is null or boards.end_date > current_date)
    )
  );
