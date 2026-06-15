-- Accept leader invite codes without exposing active invite rows to every user.

drop policy if exists "invites select leaders or active" on public.team_invites;
drop policy if exists "invites select leaders" on public.team_invites;

create policy "invites select leaders" on public.team_invites
  for select to authenticated
  using (private.is_team_leader(team_id));

create or replace function public.accept_team_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_team_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select team_id into target_team_id
  from public.team_invites
  where code = upper(trim(invite_code))
    and revoked_at is null;

  if target_team_id is null then
    raise exception 'Invite not found';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (target_team_id, current_user_id, 'leader')
  on conflict (team_id, user_id) do update set role = 'leader';

  return target_team_id;
end;
$$;

revoke execute on function public.accept_team_invite(text) from public, anon;
grant execute on function public.accept_team_invite(text) to authenticated;
