-- Add color column to members for avatar/badge display.
alter table public.members
  add column color text not null default '#1e88e5';
