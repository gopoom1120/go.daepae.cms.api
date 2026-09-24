-- ============================================================
-- franchise_users — 관리자 계정 (role 기반 다중 관리자)
-- auth.users 가입 시 handle_new_user() 트리거가 자동으로 행 생성
-- 신규가입 기본 role은 'user' — 최고관리자는 가입 후 수동으로 'admin' 승격
-- ============================================================

create table if not exists public.franchise_users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null unique,
  full_name   text,
  avatar_url  text,
  role        text        not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger franchise_users_updated_at
  before update on public.franchise_users
  for each row execute procedure public.set_updated_at();

alter table public.franchise_users enable row level security;

create policy "franchise_users_select_own"
  on public.franchise_users for select
  to authenticated
  using (auth.uid() = id);

create policy "franchise_users_update_own"
  on public.franchise_users for update
  to authenticated
  using (auth.uid() = id);

create policy "franchise_users_insert_own"
  on public.franchise_users for insert
  to authenticated
  with check (auth.uid() = id);

create policy "franchise_users_service_all"
  on public.franchise_users for all
  to service_role
  using (true)
  with check (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.franchise_users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
