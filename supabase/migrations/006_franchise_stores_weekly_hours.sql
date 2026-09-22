-- ============================================================
-- franchise_stores: business_hours(text) → weekly_hours(jsonb) 구조화
-- 요일별 오픈/마감/브레이크타임/라스트오더를 저장해 실시간 영업상태 계산에 사용
-- 형태: { "mon": { "open": "16:00", "close": "23:00", "breaks": [{"start":"15:00","end":"16:00"}], "last_order": "22:00" }, ... }
-- 키가 없는 요일은 휴무로 취급
-- ============================================================

drop view if exists public.franchise_stores_public;

alter table public.franchise_stores
  drop column if exists business_hours,
  add column if not exists weekly_hours jsonb not null default '{}'::jsonb;

create view public.franchise_stores_public
with (security_invoker = true) as
select
  id, name, slug, store_type, address, phone,
  weekly_hours, directions,
  open_date,
  case when is_revenue_public then monthly_revenue else null end       as monthly_revenue,
  case when is_revenue_public then profit_margin_percent else null end as profit_margin_percent,
  is_revenue_public, description, thumbnail_url, gallery_images, sort_order, created_at
from public.franchise_stores
where is_published = true;

update public.statkit_content_api_configs
set select_columns = 'id,name,slug,store_type,address,phone,weekly_hours,directions,open_date,monthly_revenue,profit_margin_percent,is_revenue_public,description,thumbnail_url,gallery_images,sort_order,created_at'
where resource_slug = 'franchise-stores';
