-- ============================================================
-- franchise_inquiries — 문의/창업상담 (공개 anon insert 허용)
-- region/franchise_type: 랜딩페이지 공개 제출 폼 연동용
-- ============================================================

create table if not exists public.franchise_inquiries (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  phone         text        not null,
  inquiry_type  text        not null check (inquiry_type in ('방문예약', '창업상담', '제휴문의', '기타')),
  message       text,
  status        text        not null default '신규' check (status in ('신규', '처리중', '완료')),
  admin_memo    text,
  region        text,
  franchise_type text,
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
