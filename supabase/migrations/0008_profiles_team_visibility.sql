-- Allow team members to see profile names for other users on the same team.

drop policy if exists "profiles select team members" on public.profiles;

create policy "profiles select team members" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.team_members target_membership
      join public.team_members current_membership
        on current_membership.team_id = target_membership.team_id
      where target_membership.user_id = profiles.id
        and current_membership.user_id = (select auth.uid())
    )
  );
