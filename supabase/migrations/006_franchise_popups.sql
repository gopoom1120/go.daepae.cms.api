-- ============================================================
-- franchise_popups — 팝업 공지 (이미지 + 텍스트, 여러 건 등록 가능)
-- 노출 기간(start_date~end_date)이 지나면 공개 API에서 자동으로 빠짐
-- ============================================================

create table if not exists public.franchise_popups (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  content      text,
  image_url    text,
  link_url     text,
  start_date   date,
  end_date     date,
  is_published boolean     not null default false,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists franchise_popups_sort_order_idx   on public.franchise_popups(sort_order);
create index if not exists franchise_popups_is_published_idx on public.franchise_popups(is_published);

create trigger franchise_popups_updated_at
  before update on public.franchise_popups
  for each row execute procedure public.set_updated_at();

alter table public.franchise_popups enable row level security;

create policy "franchise_popups_public_read" on public.franchise_popups for select using (is_published = true);
create policy "franchise_popups_admin_all" on public.franchise_popups for all to authenticated using (true) with check (true);
create policy "franchise_popups_service_all" on public.franchise_popups for all to service_role using (true) with check (true);

-- 발행 + 노출기간 조건을 함께 거른 공개 API 전용 뷰
create or replace view public.franchise_popups_public
with (security_invoker = true) as
select
  id, title, content, image_url, link_url, start_date, end_date, sort_order, created_at
from public.franchise_popups
where is_published = true
  and (start_date is null or start_date <= current_date)
  and (end_date is null or end_date >= current_date);
