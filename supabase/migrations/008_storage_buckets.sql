-- ============================================================
-- Storage 버킷 — 매장 갤러리 / 메뉴 썸네일 / 팝업 이미지
-- update/delete는 authenticated만 허용 (anon에 의한 임의 삭제/변조 방지)
-- insert는 현재 업로드 플로우(anon key 기반 클라이언트)가 필요하므로 anon도 허용
-- ============================================================

insert into storage.buckets (id, name, public) values ('franchise-stores', 'franchise-stores', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('franchise-menus', 'franchise-menus', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('franchise-popups', 'franchise-popups', true) on conflict (id) do nothing;

create policy "franchise_stores_bucket_read" on storage.objects for select to public using (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_update" on storage.objects for update to authenticated using (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_delete" on storage.objects for delete to authenticated using (bucket_id = 'franchise-stores');

create policy "franchise_menus_bucket_read" on storage.objects for select to public using (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_update" on storage.objects for update to authenticated using (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_delete" on storage.objects for delete to authenticated using (bucket_id = 'franchise-menus');

create policy "franchise_popups_bucket_read" on storage.objects for select to public using (bucket_id = 'franchise-popups');
create policy "franchise_popups_bucket_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'franchise-popups');
create policy "franchise_popups_bucket_update" on storage.objects for update to authenticated using (bucket_id = 'franchise-popups');
create policy "franchise_popups_bucket_delete" on storage.objects for delete to authenticated using (bucket_id = 'franchise-popups');
