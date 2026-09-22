-- ============================================================
-- franchise_stores: 영업시간(weekly_hours) 기능 제거
-- 관리자 화면에서 영업시간 입력 UI를 삭제하면서 관련 컬럼도 함께 제거
-- ============================================================

drop view if exists public.franchise_stores_public;

alter table public.franchise_stores
  drop column if exists weekly_hours;

create view public.franchise_stores_public
with (security_invoker = true) as
select
  id, name, slug, store_type, address, phone,
  directions,
  open_date,
  case when is_revenue_public then monthly_revenue else null end       as monthly_revenue,
  case when is_revenue_public then profit_margin_percent else null end as profit_margin_percent,
  is_revenue_public, description, thumbnail_url, gallery_images, sort_order, created_at
from public.franchise_stores
where is_published = true;

update public.statkit_content_api_configs
set select_columns = 'id,name,slug,store_type,address,phone,directions,open_date,monthly_revenue,profit_margin_percent,is_revenue_public,description,thumbnail_url,gallery_images,sort_order,created_at'
where resource_slug = 'franchise-stores';
