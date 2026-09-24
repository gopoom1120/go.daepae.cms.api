-- ============================================================
-- statkit_content_api_configs — 동적 REST API(/api/v1/[resource]) 토글 시스템
-- franchise 도메인 4종만 시드 (문의는 개인정보라 시드하지 않음)
-- ============================================================

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

insert into public.statkit_content_api_configs
  (resource_slug, label, table_name, is_enabled, filter_column, filter_value, filter_is_bool,
   identifier_column, identifier_type, order_column, order_direction, select_columns)
values
  ('franchise-stores', '가맹점 매장현황', 'franchise_stores_public', false, null, null, false,
   'id', 'uuid', 'sort_order', 'asc',
   'id,name,slug,store_type,address,phone,directions,open_date,monthly_revenue,profit_margin_percent,is_revenue_public,description,thumbnail_url,gallery_images,sort_order,created_at'),

  ('franchise-menus', '가맹점 메뉴', 'franchise_menus', false, 'is_available', 'true', true,
   'id', 'uuid', 'sort_order', 'asc',
   'id,category,name,description,price,unit,has_surcharge,surcharge_note,is_haccp_certified,thumbnail_url,sort_order,created_at'),

  ('franchise-popups', '가맹점 팝업 공지', 'franchise_popups_public', false, null, null, false,
   'id', 'uuid', 'sort_order', 'asc',
   'id,title,content,image_url,link_url,start_date,end_date,sort_order,created_at')

on conflict (resource_slug) do nothing;
