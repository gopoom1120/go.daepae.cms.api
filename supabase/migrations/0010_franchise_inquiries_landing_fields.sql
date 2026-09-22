-- ============================================================
-- franchise_inquiries: 랜딩페이지(go_daepae) 공개 제출 폼 연동을 위한 컬럼 보강
-- 랜딩의 "창업유형" 드롭다운(신규 창업/기존 매장 전환/다점포 확장/상담 후 결정)은
-- 기존 inquiry_type enum(방문예약/창업상담/제휴문의/기타)과 의미가 달라 별도 컬럼으로 분리.
-- 랜딩 폼에는 자유 텍스트 message가 없어 message를 nullable로 완화.
-- ============================================================

alter table public.franchise_inquiries
  add column if not exists region text,
  add column if not exists franchise_type text;

alter table public.franchise_inquiries
  alter column message drop not null;
