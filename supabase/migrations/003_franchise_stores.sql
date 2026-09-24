-- ============================================================
-- franchise_stores — 매장현황 (브랜드: 고품격대패, 단일 브랜드 전용)
-- ============================================================

create table if not exists public.franchise_stores (
  id                     uuid           primary key default gen_random_uuid(),
  name                   text           not null,
  slug                   text           not null unique,
  store_type             text           check (store_type is null or store_type in ('본점', '직영점', '가맹점')),
  address                text,
  phone                  text,
  open_date              date,
  monthly_revenue        integer,
  profit_margin_percent  numeric(5, 2),
  is_revenue_public      boolean        not null default false,
  description            text,
  thumbnail_url          text,
  gallery_images         text[]         not null default '{}',
  directions             text,
  is_published           boolean        not null default false,
  sort_order             integer        not null default 0,
  created_at             timestamptz    not null default now(),
  updated_at             timestamptz    not null default now()
);

create index if not exists franchise_stores_sort_order_idx   on public.franchise_stores(sort_order);
create index if not exists franchise_stores_slug_idx         on public.franchise_stores(slug);
create index if not exists franchise_stores_is_published_idx on public.franchise_stores(is_published);

create trigger franchise_stores_updated_at
  before update on public.franchise_stores
  for each row execute procedure public.set_updated_at();

alter table public.franchise_stores enable row level security;

create policy "franchise_stores_public_read" on public.franchise_stores for select using (is_published = true);
create policy "franchise_stores_admin_all" on public.franchise_stores for all to authenticated using (true) with check (true);
create policy "franchise_stores_service_all" on public.franchise_stores for all to service_role using (true) with check (true);

-- 매출 마스킹 뷰 — 공개 API는 반드시 이 뷰를 사용
create or replace view public.franchise_stores_public
with (security_invoker = true) as
select
  id, name, slug, store_type, address, phone, directions, open_date,
  case when is_revenue_public then monthly_revenue else null end       as monthly_revenue,
  case when is_revenue_public then profit_margin_percent else null end as profit_margin_percent,
  is_revenue_public, description, thumbnail_url, gallery_images, sort_order, created_at
from public.franchise_stores
where is_published = true;
