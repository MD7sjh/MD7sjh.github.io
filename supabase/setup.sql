-- Personal Workspace: one JSONB workspace per authenticated user.
create table if not exists public.workspace_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace_state enable row level security;
grant select, insert, update, delete on table public.workspace_state to authenticated;

drop policy if exists "workspace_select_own" on public.workspace_state;
drop policy if exists "workspace_insert_own" on public.workspace_state;
drop policy if exists "workspace_update_own" on public.workspace_state;
drop policy if exists "workspace_delete_own" on public.workspace_state;

create policy "workspace_select_own" on public.workspace_state
for select to authenticated using ((select auth.uid()) = user_id);
create policy "workspace_insert_own" on public.workspace_state
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workspace_update_own" on public.workspace_state
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "workspace_delete_own" on public.workspace_state
for delete to authenticated using ((select auth.uid()) = user_id);
