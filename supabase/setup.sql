-- PhD Master Workspace：Supabase 云同步表
-- 在 Supabase → SQL Editor → New query 中完整运行本文件。

create table if not exists public.workspace_state (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  state jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

comment on table public.workspace_state
is 'One cloud workspace JSON document per authenticated user.';

alter table public.workspace_state
enable row level security;

-- 允许 authenticated 角色访问表；真正能访问哪一行由下面的 RLS 决定。
grant select, insert, update, delete
on table public.workspace_state
to authenticated;

drop policy if exists "workspace_select_own" on public.workspace_state;
drop policy if exists "workspace_insert_own" on public.workspace_state;
drop policy if exists "workspace_update_own" on public.workspace_state;
drop policy if exists "workspace_delete_own" on public.workspace_state;

create policy "workspace_select_own"
on public.workspace_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "workspace_insert_own"
on public.workspace_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "workspace_update_own"
on public.workspace_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "workspace_delete_own"
on public.workspace_state
for delete
to authenticated
using ((select auth.uid()) = user_id);
