-- ============================================================
-- franchise-stores / franchise-menus 버킷 RLS 강화
-- 문제: 003 마이그레이션이 update/delete를 anon에게도 허용해,
--       미들웨어/mock-auth를 우회해 Supabase Storage REST API에
--       직접 요청하면 이미지 삭제/변조가 가능했음 (code-reviewer 지적)
-- 조치: update/delete는 authenticated로만 제한. insert는 현재
--       업로드 플로우(anon key 기반 클라이언트)가 필요하므로 유지.
-- ============================================================

drop policy if exists "franchise_stores_bucket_update" on storage.objects;
drop policy if exists "franchise_stores_bucket_delete" on storage.objects;
create policy "franchise_stores_bucket_update" on storage.objects for update to authenticated using (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_delete" on storage.objects for delete to authenticated using (bucket_id = 'franchise-stores');

drop policy if exists "franchise_menus_bucket_update" on storage.objects;
drop policy if exists "franchise_menus_bucket_delete" on storage.objects;
create policy "franchise_menus_bucket_update" on storage.objects for update to authenticated using (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_delete" on storage.objects for delete to authenticated using (bucket_id = 'franchise-menus');
