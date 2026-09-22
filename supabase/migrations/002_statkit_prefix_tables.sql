-- ============================================================
-- statkit.cms.api — statkit_ prefix 테이블 마이그레이션
-- 작성일: 2026-07-22
-- 목적: content_api_configs·posts·products 테이블을 statkit_ prefix로 재생성
-- 실행 순서: DROP → statkit_posts → statkit_products → statkit_content_api_configs → RLS → SEED
-- ============================================================


-- ------------------------------------------------------------
-- 1. 기존 테이블 삭제
--    CASCADE: orders.product_id FK 제약도 함께 제거됨 (orders rows는 유지)
-- ------------------------------------------------------------

drop table if exists public.content_api_configs cascade;
drop table if exists public.posts cascade;
drop table if exists public.products cascade;


-- ------------------------------------------------------------
-- 2. statkit_posts (구 news 테이블 구조)
-- ------------------------------------------------------------

create table if not exists public.statkit_posts (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  slug          text        not null unique,
  summary       text,
  content       text,
  category      text        check (category in ('업데이트', '신규 템플릿', '이벤트')),
  thumbnail_url text,
  is_published  boolean     not null default false,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists statkit_posts_sort_order_idx    on public.statkit_posts(sort_order);
create index if not exists statkit_posts_slug_idx          on public.statkit_posts(slug);
create index if not exists statkit_posts_is_published_idx  on public.statkit_posts(is_published);

create trigger statkit_posts_updated_at
  before update on public.statkit_posts
  for each row execute procedure public.set_updated_at();

alter table public.statkit_posts enable row level security;

create policy "statkit_posts_public_read"
  on public.statkit_posts for select
  using (is_published = true);

create policy "statkit_posts_admin_all"
  on public.statkit_posts for all
  to authenticated
  using (true)
  with check (true);

create policy "statkit_posts_service_all"
  on public.statkit_posts for all
  to service_role
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 3. statkit_products (구 products 테이블 구조)
-- ------------------------------------------------------------

create table if not exists public.statkit_products (
  id            uuid           primary key default gen_random_uuid(),
  slug          text           not null unique,
  name          text           not null,
  description   text,
  category      text,
  price         integer,
  thumbnail_url text,
  demo_url      text,
  includes      text[],
  file_path     text,
  is_active     boolean        not null default true,
  sort_order    integer        not null default 0,
  price_type    text           not null default 'free' check (price_type in ('free', 'paid')),
  base_price    numeric(10, 2),
  options       jsonb,
  status        text           not null default 'active' check (status in ('active', 'inactive')),
  created_at    timestamptz    not null default now(),
  updated_at    timestamptz    not null default now()
);

create index if not exists statkit_products_sort_order_idx on public.statkit_products(sort_order);
create index if not exists statkit_products_slug_idx       on public.statkit_products(slug);
create index if not exists statkit_products_is_active_idx  on public.statkit_products(is_active);

create trigger statkit_products_updated_at
  before update on public.statkit_products
  for each row execute procedure public.set_updated_at();

alter table public.statkit_products enable row level security;

create policy "statkit_products_public_read"
  on public.statkit_products for select
  using (is_active = true);

create policy "statkit_products_admin_all"
  on public.statkit_products for all
  to authenticated
  using (true)
  with check (true);

create policy "statkit_products_service_all"
  on public.statkit_products for all
  to service_role
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 4. statkit_content_api_configs (구 content_api_configs 테이블 구조)
-- ------------------------------------------------------------

create table if not exists public.statkit_content_api_configs (
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

create index if not exists statkit_content_api_configs_slug_idx
  on public.statkit_content_api_configs(resource_slug);

create trigger statkit_content_api_configs_updated_at
  before update on public.statkit_content_api_configs
  for each row execute procedure public.set_updated_at();

alter table public.statkit_content_api_configs enable row level security;

create policy "statkit_content_api_configs_admin_all"
  on public.statkit_content_api_configs for all
  to authenticated
  using (true)
  with check (true);

create policy "statkit_content_api_configs_service_all"
  on public.statkit_content_api_configs for all
  to service_role
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 5. statkit_content_api_configs 시드 데이터
--    blog, products → statkit_ 신규 테이블 참조
--    portfolio, orders, quotes, users → 기존 테이블 참조 유지
-- ------------------------------------------------------------

insert into public.statkit_content_api_configs
  (resource_slug, label, table_name, is_enabled,
   filter_column, filter_value, filter_is_bool,
   identifier_column, identifier_type,
   order_column, order_direction, select_columns)
values
  ('blog',      '블로그',     'statkit_posts',     true,
   'is_published', 'true', true,
   'slug', 'text', 'sort_order', 'asc',
   'id,title,slug,summary,content,category,thumbnail_url,is_published,sort_order,created_at'),

  ('products',  '상품',       'statkit_products',  true,
   'is_active', 'true', true,
   'id', 'uuid', 'sort_order', 'asc',
   'id,slug,name,description,category,thumbnail_url,demo_url,includes,price_type,base_price,options,created_at,updated_at'),

  ('portfolio', '포트폴리오', 'portfolios',         false,
   'is_published', 'true', true,
   'id', 'uuid', 'sort_order', 'asc',
   'id,title,category,description,tags,thumbnail_url,site_url,images,sort_order,created_at'),

  ('orders',    '주문',       'orders',             false,
   null, null, false,
   'id', 'uuid', 'created_at', 'desc', null),

  ('quotes',    '견적 신청',  'quote_submissions',  false,
   null, null, false,
   'id', 'uuid', 'created_at', 'desc', null),

  ('users',     '유저',       'profiles',           false,
   null, null, false,
   'id', 'uuid', 'created_at', 'desc', null)

on conflict (resource_slug) do nothing;
