-- ============================================================
-- franchise_stores 추가 필드: 찾아오는 길 / 영업시간 / 인스타그램 / 편의시설
-- 네이버 플레이스 정보 항목 참고 (2026-08-31)
-- ============================================================

alter table public.franchise_stores
  add column if not exists business_hours text,
  add column if not exists directions text,
  add column if not exists instagram_url text,
  add column if not exists amenities text[] not null default '{}';

-- franchise_stores_public 뷰 재정의 (신규 컬럼 포함, 매출 마스킹 로직은 그대로 유지)
-- 컬럼을 중간에 추가하면 CREATE OR REPLACE VIEW가 컬럼명 변경으로 오인해 실패하므로 drop 후 재생성
drop view if exists public.franchise_stores_public;

create view public.franchise_stores_public
with (security_invoker = true) as
select
  id, name, slug, store_type, address, phone,
  business_hours, directions, instagram_url, amenities,
  open_date,
  case when is_revenue_public then monthly_revenue else null end       as monthly_revenue,
  case when is_revenue_public then profit_margin_percent else null end as profit_margin_percent,
  is_revenue_public, description, thumbnail_url, gallery_images, sort_order, created_at
from public.franchise_stores
where is_published = true;

-- statkit_content_api_configs의 franchise-stores select_columns에 신규 컬럼 반영
update public.statkit_content_api_configs
set select_columns = 'id,name,slug,store_type,address,phone,business_hours,directions,instagram_url,amenities,open_date,monthly_revenue,profit_margin_percent,is_revenue_public,description,thumbnail_url,gallery_images,sort_order,created_at'
where resource_slug = 'franchise-stores';
