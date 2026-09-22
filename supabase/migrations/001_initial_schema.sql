-- ============================================================
-- statkit.cms.api — Initial Schema
-- 추출일: 2026-07-20
-- 실행 순서: 함수 → profiles → products → orders → news → portfolios → quote_submissions → content_api_configs
-- ============================================================


-- ------------------------------------------------------------
-- 1. 공통 트리거 함수
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ------------------------------------------------------------
-- 2. 신규 가입 시 profiles 자동 생성
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
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


-- ------------------------------------------------------------
-- 3. profiles 테이블
-- ------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  role        text not null default 'admin' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);


-- ------------------------------------------------------------
-- 4. products 테이블 (orders FK 참조하므로 먼저 생성)
-- ------------------------------------------------------------

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  category      text,
  price         integer,
  thumbnail_url text,
  demo_url      text,
  includes      text[],
  file_path     text,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  price_type    text not null default 'free' check (price_type in ('free', 'paid')),
  base_price    numeric(10, 2),
  options       jsonb,
  status        text not null default 'active' check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_sort_order_idx on public.products(sort_order);

create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

alter table public.products enable row level security;

create policy "products_public_read"
  on public.products for select
  using (is_active = true);

create policy "authenticated full access"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

create policy "products_service_role_all"
  on public.products for all
  to service_role
  using (true);


-- ------------------------------------------------------------
-- 5. orders 테이블 (profiles + products FK)
-- ------------------------------------------------------------

create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  product_id  uuid references public.products(id),
  order_id    text not null unique,
  amount      integer not null,
  status      text not null default 'pending'
                check (status in ('pending', 'pending_confirm', 'paid', 'cancelled')),
  payment_key text,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "users can read own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = user_id);

-- pending 상태일 때만 pending_confirm으로 변경 허용 (결제 알림 단계)
create policy "users can update own orders"
  on public.orders for update
  to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('pending', 'pending_confirm'));


-- ------------------------------------------------------------
-- 6. news 테이블
-- ------------------------------------------------------------

create table public.news (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  summary       text,
  content       text,
  category      text check (category in ('업데이트', '신규 템플릿', '이벤트')),
  thumbnail_url text,
  is_published  boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index news_sort_order_idx on public.news(sort_order);

create trigger news_updated_at
  before update on public.news
  for each row execute procedure public.set_updated_at();

alter table public.news enable row level security;

create policy "published news readable by all"
  on public.news for select
  using (is_published = true);

create policy "admin can manage news"
  on public.news for all
  to authenticated
  using (true);


-- ------------------------------------------------------------
-- 7. portfolios 테이블
-- ------------------------------------------------------------

create table public.portfolios (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text,
  description   text,
  tags          text[] default '{}',
  thumbnail_url text,
  site_url      text,
  images        text[] default '{}',
  is_published  boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger portfolios_updated_at
  before update on public.portfolios
  for each row execute procedure public.set_updated_at();

alter table public.portfolios enable row level security;

create policy "공개 포트폴리오 조회 허용"
  on public.portfolios for select
  using (is_published = true);

create policy "admin can manage portfolios"
  on public.portfolios for all
  to authenticated
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 8. quote_submissions 테이블
-- ------------------------------------------------------------

create table public.quote_submissions (
  id                  uuid primary key default gen_random_uuid(),
  selected_categories text[],
  selected_items      jsonb,
  schedule            text,
  style_preferences   text[],
  target_age          text,
  contact_name        text not null,
  contact_value       text not null,
  contact_email       text not null,
  business_number     text,
  project_summary     text,
  reference_urls      text[],
  estimated_total     integer,
  ip_address          text,
  user_agent          text,
  referer             text,
  is_authenticated    boolean default false,
  utm_params          jsonb,
  shop_industry       text,
  shop_status         text,
  production_scope    text,
  required_features   text[],
  needs_system_dev    boolean default false,
  created_at          timestamptz not null default now()
);

alter table public.quote_submissions enable row level security;

create policy "Anyone can insert quote_submissions"
  on public.quote_submissions for insert
  with check (true);

-- profiles.role 기반 admin 판별 (JWT role 클레임 사용 불가 — Supabase는 항상 'authenticated' 반환)
create policy "Admin can read quote_submissions"
  on public.quote_submissions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ------------------------------------------------------------
-- 9. content_api_configs 테이블 (동적 REST API 토글 시스템)
-- resource_slug → 실제 테이블명 매핑:
--   blog      → news
--   portfolio → portfolios
--   quotes    → quote_submissions
-- ------------------------------------------------------------

create table public.content_api_configs (
  id                uuid        primary key default gen_random_uuid(),
  resource_slug     text        not null unique,
  label             text        not null,
  table_name        text        not null,
  is_enabled        boolean     not null default false,
  filter_column     text,
  filter_value      text,
  filter_is_bool    boolean     not null default false,
  identifier_column text        not null default 'id',
  identifier_type   text        not null default 'uuid' check (identifier_type in ('uuid', 'text')),
  order_column      text        not null default 'created_at',
  order_direction   text        not null default 'desc' check (order_direction in ('asc', 'desc')),
  select_columns    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger content_api_configs_updated_at
  before update on public.content_api_configs
  for each row execute procedure public.set_updated_at();

alter table public.content_api_configs enable row level security;

create policy "admin full access"
  on public.content_api_configs
  for all to authenticated
  using (true)
  with check (true);

insert into public.content_api_configs
  (resource_slug, label, table_name, is_enabled,
   filter_column, filter_value, filter_is_bool,
   identifier_column, identifier_type,
   order_column, order_direction, select_columns)
values
  ('blog',      '블로그',     'news',             true,
   'is_published', 'true', true,
   'slug', 'text', 'sort_order', 'asc',
   'id,title,slug,summary,content,category,thumbnail_url,is_published,sort_order,created_at'),
  ('products',  '상품',       'products',          true,
   'is_active', 'true', true,
   'id', 'uuid', 'sort_order', 'asc',
   'id,slug,name,description,category,thumbnail_url,demo_url,includes,price_type,base_price,options,created_at,updated_at'),
  ('portfolio', '포트폴리오', 'portfolios',         false,
   'is_published', 'true', true,
   'id', 'uuid', 'sort_order', 'asc',
   'id,title,category,description,tags,thumbnail_url,site_url,images,sort_order,created_at'),
  ('orders',    '주문',       'orders',             false,
   null, null, false, 'id', 'uuid', 'created_at', 'desc', null),
  ('quotes',    '견적 신청',  'quote_submissions',  false,
   null, null, false, 'id', 'uuid', 'created_at', 'desc', null),
  ('users',     '유저',       'profiles',           false,
   null, null, false, 'id', 'uuid', 'created_at', 'desc', null);
