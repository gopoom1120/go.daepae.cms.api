-- ============================================================
-- statkit.franchise.cms.api — franchise_ 도메인 (가맹점 관리)
-- 대상: franchise_stores, franchise_menus, franchise_inquiries
-- 브랜드: 고품격대패 (단일 브랜드 전용, brand_id 없음)
-- ============================================================

-- 1. franchise_stores (매장현황)
create table if not exists public.franchise_stores (
  id                     uuid           primary key default gen_random_uuid(),
  name                   text           not null,                       -- '왕십리 본점' 등
  slug                   text           not null unique,                -- 'wangsimni' 등
  store_type             text           check (store_type is null or store_type in ('본점', '직영점', '가맹점')),
  address                text,
  phone                  text,
  open_date              date,
  monthly_revenue        integer,                                       -- 원 단위
  profit_margin_percent  numeric(5, 2),                                 -- %
  is_revenue_public      boolean        not null default false,         -- 매출 대외 공개 토글
  description            text,
  thumbnail_url          text,
  gallery_images         text[]         not null default '{}',
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

-- 1-1. franchise_stores_public — 매출 마스킹 뷰 (공개 API는 반드시 이 뷰를 사용)
create or replace view public.franchise_stores_public
with (security_invoker = true) as
select
  id, name, slug, store_type, address, phone, open_date,
  case when is_revenue_public then monthly_revenue else null end       as monthly_revenue,
  case when is_revenue_public then profit_margin_percent else null end as profit_margin_percent,
  is_revenue_public, description, thumbnail_url, gallery_images, sort_order, created_at
from public.franchise_stores
where is_published = true;

-- 2. franchise_menus (메뉴 & 셀프바)
create table if not exists public.franchise_menus (
  id                 uuid        primary key default gen_random_uuid(),
  category           text        not null check (category in ('고기', '셀프바')),
  name               text        not null,
  description        text,
  price              integer,
  unit               text,
  has_surcharge      boolean     not null default false,  -- 꽃등심 대패(++) 같은 추가금 품목
  surcharge_note     text,
  is_haccp_certified boolean     not null default false,
  thumbnail_url      text,
  is_available       boolean     not null default true,
  sort_order         integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists franchise_menus_category_idx     on public.franchise_menus(category);
create index if not exists franchise_menus_sort_order_idx   on public.franchise_menus(sort_order);
create index if not exists franchise_menus_is_available_idx on public.franchise_menus(is_available);

create trigger franchise_menus_updated_at
  before update on public.franchise_menus
  for each row execute procedure public.set_updated_at();

alter table public.franchise_menus enable row level security;

create policy "franchise_menus_public_read" on public.franchise_menus for select using (is_available = true);
create policy "franchise_menus_admin_all" on public.franchise_menus for all to authenticated using (true) with check (true);
create policy "franchise_menus_service_all" on public.franchise_menus for all to service_role using (true) with check (true);

-- 3. franchise_inquiries (문의/창업상담) — 공개 anon insert 허용
create table if not exists public.franchise_inquiries (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  phone         text        not null,
  inquiry_type  text        not null check (inquiry_type in ('방문예약', '창업상담', '제휴문의', '기타')),
  message       text        not null,
  status        text        not null default '신규' check (status in ('신규', '처리중', '완료')),
  admin_memo    text,
  ip_address    text,
  user_agent    text,
  referer       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists franchise_inquiries_status_idx       on public.franchise_inquiries(status);
create index if not exists franchise_inquiries_inquiry_type_idx on public.franchise_inquiries(inquiry_type);
create index if not exists franchise_inquiries_created_at_idx   on public.franchise_inquiries(created_at desc);

create trigger franchise_inquiries_updated_at
  before update on public.franchise_inquiries
  for each row execute procedure public.set_updated_at();

alter table public.franchise_inquiries enable row level security;

create policy "franchise_inquiries_public_insert" on public.franchise_inquiries for insert to anon with check (true);
create policy "franchise_inquiries_admin_all" on public.franchise_inquiries for all to authenticated using (true) with check (true);
create policy "franchise_inquiries_service_all" on public.franchise_inquiries for all to service_role using (true) with check (true);

-- 4. statkit_content_api_configs 시드 (franchise-stores → 마스킹 뷰, franchise-menus → base table)
--    franchise_inquiries는 시드하지 않음 (개인정보 리드 데이터, 공개 read 대상 아님). 둘 다 is_enabled=false로 시작.
insert into public.statkit_content_api_configs
  (resource_slug, label, table_name, is_enabled, filter_column, filter_value, filter_is_bool,
   identifier_column, identifier_type, order_column, order_direction, select_columns)
values
  ('franchise-stores', '가맹점 매장현황', 'franchise_stores_public', false, null, null, false,
   'id', 'uuid', 'sort_order', 'asc',
   'id,name,slug,store_type,address,phone,open_date,monthly_revenue,profit_margin_percent,is_revenue_public,description,thumbnail_url,gallery_images,sort_order,created_at'),
  ('franchise-menus', '가맹점 메뉴', 'franchise_menus', false, 'is_available', 'true', true,
   'id', 'uuid', 'sort_order', 'asc',
   'id,category,name,description,price,unit,has_surcharge,surcharge_note,is_haccp_certified,thumbnail_url,sort_order,created_at')
on conflict (resource_slug) do nothing;

-- 5. Storage 버킷 (매장 갤러리 / 메뉴 썸네일) — anon 업로드까지 명시적으로 허용
insert into storage.buckets (id, name, public) values ('franchise-stores', 'franchise-stores', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('franchise-menus', 'franchise-menus', true) on conflict (id) do nothing;

create policy "franchise_stores_bucket_read" on storage.objects for select to public using (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_update" on storage.objects for update to anon, authenticated using (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'franchise-stores');

create policy "franchise_menus_bucket_read" on storage.objects for select to public using (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_update" on storage.objects for update to anon, authenticated using (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'franchise-menus');
