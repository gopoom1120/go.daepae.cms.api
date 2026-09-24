-- ============================================================
-- statkit.franchise.cms.api — 공통 함수
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
