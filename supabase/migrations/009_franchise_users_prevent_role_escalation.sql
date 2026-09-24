-- ============================================================
-- franchise_users.role 셀프 변경 차단
-- franchise_users_update_own RLS는 행(row) 단위만 제한하고 컬럼 단위 제한이 없어,
-- 로그인한 사용자가 본인 role을 'user' -> 'admin'으로 직접 바꿀 수 있었다.
-- service_role(관리자 SQL/서버 전용 클라이언트)만 role 변경을 허용한다.
-- ============================================================

create or replace function public.prevent_self_role_change()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role 변경은 service_role만 가능합니다';
  end if;
  return new;
end;
$$;

create trigger franchise_users_prevent_role_escalation
  before update on public.franchise_users
  for each row execute procedure public.prevent_self_role_change();
