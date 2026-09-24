-- ============================================================
-- franchise_menus — 메뉴 & 셀프바
-- ============================================================

create table if not exists public.franchise_menus (
  id                 uuid        primary key default gen_random_uuid(),
  category           text        not null check (category in ('고기', '셀프바')),
  name               text        not null,
  description        text,
  price              integer,
  unit               text,
  has_surcharge      boolean     not null default false,
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
