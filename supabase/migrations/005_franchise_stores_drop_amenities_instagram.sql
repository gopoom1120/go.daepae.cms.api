-- ============================================================
-- franchise_stores: amenities / instagram_url 필드 제거 (요청에 따라 불필요 판단)
-- ============================================================

drop view if exists public.franchise_stores_public;

alter table public.franchise_stores
  drop column if exists amenities,
  drop column if exists instagram_url;

create view public.franchise_stores_public
with (security_invoker = true) as
select
  id, name, slug, store_type, address, phone,
  business_hours, directions,
  open_date,
  case when is_revenue_public then monthly_revenue else null end       as monthly_revenue,
  case when is_revenue_public then profit_margin_percent else null end as profit_margin_percent,
  is_revenue_public, description, thumbnail_url, gallery_images, sort_order, created_at
from public.franchise_stores
where is_published = true;

update public.statkit_content_api_configs
set select_columns = 'id,name,slug,store_type,address,phone,business_hours,directions,open_date,monthly_revenue,profit_margin_percent,is_revenue_public,description,thumbnail_url,gallery_images,sort_order,created_at'
where resource_slug = 'franchise-stores';
