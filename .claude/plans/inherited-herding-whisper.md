# franchise 도메인(가맹점 관리) 추가 계획

## Context

사용자는 "고품격대패" 프랜차이즈 고깃집 브랜드의 웹사이트 기획서(`/Users/mac/Downloads/고품격대패_웹사이트_기획서.md`)를 참고해, 이 브랜드의 매장·메뉴·문의를 관리하는 admin 페이지를 이 CMS(statkit.franchise.cms.api)에 새로 만들려 한다. 기존 `statkit_*` 콘텐츠 테이블(posts/products/portfolios)은 그대로 두고, 손대지 않는다.

사용자 확정 사항 (AskUserQuestion으로 확인 완료):
- 핵심 3개 리소스만 구현: **매장현황 / 메뉴 / 문의(창업상담)**. 브랜드 히어로 슬로건·스토리 텍스트는 이번 스코프 아님.
- **단일 브랜드 전용** — `brand_id` 없이 설계 (저장소명이 `franchise.cms.api`라 향후 멀티 브랜드 확장 가능성은 있지만, 지금은 고품격대패 전용으로 단순하게 시작).
- 모든 신규 테이블은 **`franchise_` 접두사** 사용 (`franchise_stores`, `franchise_menus`, `franchise_inquiries`). CLAUDE.md의 기존 `statkit_` 규칙과 별개로, 이번 요청에서 사용자가 명시적으로 지정한 새 도메인 접두사다.
- `franchise_inquiries`는 지금 바로 **공개 anon insert RLS**까지 세팅 — 나중에 만들 고객용 랜딩페이지가 비로그인 상태로 문의를 등록할 수 있도록 미리 준비.

## 조사 중 발견한 드리프트 (구현 시 반영)

1. `supabase/migrations/*.sql`은 Supabase CLI 이력으로 추적되지 않는다(`list_migrations` 결과 빈 배열) — 이 저장소는 마이그레이션 파일을 "정의 문서"로 유지하되 실제 적용은 MCP `apply_migration`으로 직접 실행하는 방식. 003번 마이그레이션도 동일하게 처리한다.
2. **Storage 버킷 드리프트**: 실제 존재하는 버킷은 `posts`, `products` 두 개뿐이고, 코드가 참조하는 `portfolio-images`는 DB에 없다. 게다가 `storage.objects` RLS 정책이 0개다. 이 프로젝트는 실제 Supabase Auth 세션이 없는 완전 mock-auth 방식이라 브라우저의 `createClient()`는 항상 `anon` role로 동작한다. 새로 만드는 `franchise-*` 버킷은 이 문제를 반복하지 않도록 **`anon`, `authenticated` 둘 다에 명시적 INSERT/UPDATE/DELETE 정책**을 부여한다 (기존 버킷은 이번 스코프 밖, 손대지 않음).
3. 테이블 RLS의 `authenticated` 대상 정책은 이 앱에서 사실상 죽은 코드다(관리자 CRUD는 전부 `createAdminClient()`/service_role로 RLS 우회) — 그래도 기존 컨벤션과 방어적 설계를 위해 동일한 3-tier 패턴(`public_read` / `admin_all(authenticated)` / `service_all(service_role)`)을 유지한다.
4. 매장의 매출/수익률처럼 **행 단위로 공개 여부가 갈리는 컬럼**은 `statkit_content_api_configs`의 정적 `select_columns`(테이블 전체 동일 컬럼셋)로는 마스킹할 수 없다. 이를 위해 **`franchise_stores_public` 뷰**를 만들어 `is_revenue_public=false`인 매장은 매출 관련 컬럼을 `null`로 가린다. 동적 공개 API는 base table이 아니라 이 뷰를 가리키도록 시드한다.

## DDL — `supabase/migrations/003_franchise_domain.sql` (신규 파일)

```sql
-- ============================================================
-- statkit.franchise.cms.api — franchise_ 도메인 (가맹점 관리)
-- 대상: franchise_stores, franchise_menus, franchise_inquiries
-- 브랜드: 고품격대패 (단일 브랜드 전용, brand_id 없음)
-- ============================================================

-- 1. franchise_stores (매장현황)
create table if not exists public.franchise_stores (
  id                     uuid           primary key default gen_random_uuid(),
  name                   text           not null,                       -- '왕십리 본점' 등
  slug                   text           not null unique,                -- 'wangsimni' 등
  store_type             text           check (store_type is null or store_type in ('본점', '직영점', '가맹점')),
  address                text,
  phone                  text,
  open_date              date,
  monthly_revenue        integer,                                       -- 원 단위
  profit_margin_percent  numeric(5, 2),                                 -- %
  is_revenue_public      boolean        not null default false,         -- 매출 대외 공개 토글
  description            text,
  thumbnail_url          text,
  gallery_images         text[]         not null default '{}',
  is_published           boolean        not null default false,
  sort_order             integer        not null default 0,
  created_at             timestamptz    not null default now(),
  updated_at             timestamptz    not null default now()
);

create index if not exists franchise_stores_sort_order_idx   on public.franchise_stores(sort_order);
create index if not exists franchise_stores_slug_idx         on public.franchise_stores(slug);
create index if not exists franchise_stores_is_published_idx on public.franchise_stores(is_published);

create trigger franchise_stores_updated_at
  before update on public.franchise_stores
  for each row execute procedure public.set_updated_at();

alter table public.franchise_stores enable row level security;

create policy "franchise_stores_public_read" on public.franchise_stores for select using (is_published = true);
create policy "franchise_stores_admin_all" on public.franchise_stores for all to authenticated using (true) with check (true);
create policy "franchise_stores_service_all" on public.franchise_stores for all to service_role using (true) with check (true);

-- 1-1. franchise_stores_public — 매출 마스킹 뷰 (공개 API는 반드시 이 뷰를 사용)
create or replace view public.franchise_stores_public
with (security_invoker = true) as
select
  id, name, slug, store_type, address, phone, open_date,
  case when is_revenue_public then monthly_revenue else null end       as monthly_revenue,
  case when is_revenue_public then profit_margin_percent else null end as profit_margin_percent,
  is_revenue_public, description, thumbnail_url, gallery_images, sort_order, created_at
from public.franchise_stores
where is_published = true;

-- 2. franchise_menus (메뉴 & 셀프바)
create table if not exists public.franchise_menus (
  id                 uuid        primary key default gen_random_uuid(),
  category           text        not null check (category in ('고기', '셀프바')),
  name               text        not null,
  description        text,
  price              integer,
  unit               text,
  has_surcharge      boolean     not null default false,  -- 꽃등심 대패(++) 같은 추가금 품목
  surcharge_note     text,
  is_haccp_certified boolean     not null default false,
  thumbnail_url      text,
  is_available       boolean     not null default true,
  sort_order         integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists franchise_menus_category_idx     on public.franchise_menus(category);
create index if not exists franchise_menus_sort_order_idx   on public.franchise_menus(sort_order);
create index if not exists franchise_menus_is_available_idx on public.franchise_menus(is_available);

create trigger franchise_menus_updated_at
  before update on public.franchise_menus
  for each row execute procedure public.set_updated_at();

alter table public.franchise_menus enable row level security;

create policy "franchise_menus_public_read" on public.franchise_menus for select using (is_available = true);
create policy "franchise_menus_admin_all" on public.franchise_menus for all to authenticated using (true) with check (true);
create policy "franchise_menus_service_all" on public.franchise_menus for all to service_role using (true) with check (true);

-- 3. franchise_inquiries (문의/창업상담) — 공개 anon insert 허용
create table if not exists public.franchise_inquiries (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  phone         text        not null,
  inquiry_type  text        not null check (inquiry_type in ('방문예약', '창업상담', '제휴문의', '기타')),
  message       text        not null,
  status        text        not null default '신규' check (status in ('신규', '처리중', '완료')),
  admin_memo    text,
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

-- 4. statkit_content_api_configs 시드 (franchise-stores → 마스킹 뷰, franchise-menus → base table)
--    franchise_inquiries는 시드하지 않음 (개인정보 리드 데이터, 공개 read 대상 아님). 둘 다 is_enabled=false로 시작.
insert into public.statkit_content_api_configs
  (resource_slug, label, table_name, is_enabled, filter_column, filter_value, filter_is_bool,
   identifier_column, identifier_type, order_column, order_direction, select_columns)
values
  ('franchise-stores', '가맹점 매장현황', 'franchise_stores_public', false, null, null, false,
   'id', 'uuid', 'sort_order', 'asc',
   'id,name,slug,store_type,address,phone,open_date,monthly_revenue,profit_margin_percent,is_revenue_public,description,thumbnail_url,gallery_images,sort_order,created_at'),
  ('franchise-menus', '가맹점 메뉴', 'franchise_menus', false, 'is_available', 'true', true,
   'id', 'uuid', 'sort_order', 'asc',
   'id,category,name,description,price,unit,has_surcharge,surcharge_note,is_haccp_certified,thumbnail_url,sort_order,created_at')
on conflict (resource_slug) do nothing;

-- 5. Storage 버킷 (매장 갤러리 / 메뉴 썸네일) — anon 업로드까지 명시적으로 허용
insert into storage.buckets (id, name, public) values ('franchise-stores', 'franchise-stores', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('franchise-menus', 'franchise-menus', true) on conflict (id) do nothing;

create policy "franchise_stores_bucket_read" on storage.objects for select to public using (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_update" on storage.objects for update to anon, authenticated using (bucket_id = 'franchise-stores');
create policy "franchise_stores_bucket_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'franchise-stores');

create policy "franchise_menus_bucket_read" on storage.objects for select to public using (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_update" on storage.objects for update to anon, authenticated using (bucket_id = 'franchise-menus');
create policy "franchise_menus_bucket_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'franchise-menus');
```

마이그레이션은 `mcp__supabase__apply_migration`으로 직접 실행한다 (이 프로젝트는 CLI 이력을 쓰지 않으므로 `supabase migration up` 등에 의존하지 않음). 왕십리/천호/시흥 실데이터, 메뉴 9종 시드는 스키마와 분리해 관리자 UI로 직접 입력하거나 별도 요청 시 추가한다 (이번 계획엔 미포함).

## 코드 레이어 — 기존 `portfolios` 리소스 패턴을 그대로 복제

### 타입 (`src/types/`)
- `franchise-store.ts` — `FranchiseStore`, `FranchiseStoreFormInput`, `FranchiseStoreType`
- `franchise-menu.ts` — `FranchiseMenu`, `FranchiseMenuFormInput`, `FranchiseMenuCategory`
- `franchise-inquiry.ts` — `FranchiseInquiry`, `InquiryType`, `InquiryStatus` (Form 타입 없음 — 관리자 생성 폼이 없으므로)

### Supabase 쿼리 계층 (`src/libs/supabase/queries/`, `portfolios.admin.ts` 그대로 복제해 컬럼만 교체)
- `franchise-stores.admin.ts`: `getAllFranchiseStores`, `getFranchiseStoreByIdAdmin`, `createFranchiseStore`, `updateFranchiseStore`, `deleteFranchiseStore`, `updateFranchiseStoresSortOrder`
- `franchise-menus.admin.ts`: `getAllFranchiseMenus`, `getFranchiseMenusByCategory`, `getFranchiseMenuByIdAdmin`, `createFranchiseMenu`, `updateFranchiseMenu`, `deleteFranchiseMenu`, `updateFranchiseMenusSortOrder`
- `franchise-inquiries.admin.ts`: `getAllInquiries`, `getInquiryByIdAdmin`, `updateInquiryStatus(id, status, adminMemo?)`, `deleteInquiry` — **create 없음** (공개 insert는 나중에 만들 고객용 랜딩페이지의 책임 범위)

`data-access-rules.md` 규칙대로 읽기 함수(`getAllXxx`/`getXxxById`)는 각 `page.tsx`(RSC)에서 직접 import하고, `actions.ts`는 뮤테이션 함수만 감싼다.

### CSV 내보내기
새 라이브러리·API 라우트 추가 없이 `InquiriesTable.tsx`(클라이언트) 안에서 처리 — 화면에 로드된(검색/필터 적용된) 목록을 그대로 CSV로 직렬화. 재사용 헬퍼 `src/libs/csv.ts`에 순수 함수 `toCsv(rows, headers)` 하나만 추가.

### Storage 업로드
`PortfolioForm`/`ProductForm`의 인라인 업로드 함수 패턴 그대로 재사용 (`FranchiseStoreForm`은 `franchise-stores` 버킷, `FranchiseMenuForm`은 `franchise-menus` 버킷). `URL.createObjectURL` 미리보기 + cleanup, 10MB 제한 동일 적용.

### 라우트 구조 (`src/app/(admin)/franchise/`)
```
franchise/
├── stores/
│   ├── page.tsx, FranchiseStoresTable.tsx, actions.ts
│   ├── new/{page.tsx, NewFranchiseStoreForm.tsx}
│   └── [id]/edit/{page.tsx, EditFranchiseStoreForm.tsx}
├── menus/
│   ├── page.tsx, FranchiseMenusTable.tsx, actions.ts
│   ├── new/{page.tsx, NewFranchiseMenuForm.tsx}
│   └── [id]/edit/{page.tsx, EditFranchiseMenuForm.tsx}
└── inquiries/
    ├── page.tsx, InquiriesTable.tsx  (검색/상태필터/상태변경/CSV 다운로드)
    └── actions.ts                    (updateInquiryStatusAction, deleteInquiryAction만 — new/edit 없음)
```
공용 폼 컴포넌트: `src/components/admin/FranchiseStoreForm/index.tsx`, `FranchiseMenuForm/index.tsx`.

### 사이드바 (`src/components/admin/Sidebar/index.tsx:12-19`)
`NAV_ITEMS` 배열에 3개 추가:
```ts
{ label: '가맹점 매장현황', href: '/franchise/stores' },
{ label: '가맹점 메뉴', href: '/franchise/menus' },
{ label: '가맹점 문의', href: '/franchise/inquiries' },
```

### 미들웨어 (`src/middleware.ts`) — 반드시 2곳 동시 수정
- `ADMIN_PATHS`(4행)에 `'/franchise'` 추가 → `/franchise/stores`, `/franchise/menus`, `/franchise/inquiries` 전부 prefix 매칭으로 보호됨.
- `config.matcher`(73-88행)에 `'/franchise/:path*'` 추가 — **이걸 빠뜨리면 Next.js가 이 경로에서 미들웨어 자체를 실행하지 않아 인증 체크가 완전히 우회된다.**

### settings 연동
`/settings`가 `getAllApiConfigs()`로 전체 config를 자동으로 읽으므로, 003 마이그레이션의 시드만 들어가면 `franchise-stores`/`franchise-menus` 토글 카드가 별도 코드 수정 없이 자동 노출된다.

## 작업 순서
1. `003_franchise_domain.sql` 작성 → `apply_migration`으로 적용 (테이블 3개 + 뷰 1개 + RLS + content_api_configs 시드 + storage 버킷/정책)
2. 타입 3개 파일
3. Supabase 쿼리 계층 3개 파일
4. Server Actions 3개 파일
5. CSV 헬퍼 (`src/libs/csv.ts`)
6. UI 컴포넌트 (Form 2개 + Table 3개)
7. 라우트 페이지 (stores/menus는 list+new+edit, inquiries는 list만)
8. 사이드바 `NAV_ITEMS` 3항목 추가
9. 미들웨어 `ADMIN_PATHS` + `config.matcher` 동시 수정
10. settings 자동 반영 확인 (코드 수정 불필요, 시드만으로 노출)

## 검증

1. **스키마**: `mcp__supabase__list_tables`로 `franchise_stores`, `franchise_menus`, `franchise_inquiries`, `franchise_stores_public`(view) 생성 및 `rls_enabled: true` 확인. `mcp__supabase__get_advisors(type: security)`로 RLS 경고 없는지 확인.
2. **RLS**: `execute_sql`로 `select * from pg_policies where tablename in (...)` — `franchise_inquiries_public_insert`가 `anon` role에 걸려 있는지 특히 확인.
3. **Storage**: `select id, public from storage.buckets where id like 'franchise-%'`, `pg_policies where schemaname='storage'`로 버킷·정책 확인.
4. **content_api_configs**: 시드 2건이 `is_enabled=false`로 들어갔는지, `franchise-stores`가 `franchise_stores_public`을 가리키는지 확인.
5. **로컬 동작 (`yarn dev`)**:
   - `/franchise/stores`, `/franchise/menus`, `/franchise/inquiries`를 비로그인 상태로 접속 시 `/sign/in`으로 리다이렉트되는지 (미들웨어 보호 확인 — 가장 놓치기 쉬운 부분).
   - 로그인 후 매장/메뉴 신규 등록 → 이미지 업로드(콘솔에 storage RLS 에러 없는지) → 목록 반영 → 드래그 정렬 → 수정 → 삭제까지 CRUD 풀 사이클.
   - `is_revenue_public` 토글 후, `execute_sql`로 `select * from franchise_stores_public`을 직접 조회해 비공개 매장의 매출/수익률이 `null`로 마스킹되는지 확인.
   - `franchise_inquiries`는 관리자 생성 폼이 없으므로 `execute_sql`로 직접 insert해 anon 정책 시뮬레이션 → `/franchise/inquiries` 목록 반영 → 상태 변경(신규→처리중→완료) → CSV 다운로드 동작 확인.
   - `/settings`에서 토글 카드 노출 확인, 토글 on 후 `/api/v1/franchise-stores`를 `X-API-Key` 헤더로 호출해 비공개 매장의 `monthly_revenue`가 `null`로 응답되는지 curl로 확인.
6. **회귀**: `/blog`, `/products`, `/portfolio` 라우트와 기존 `statkit_*` 테이블이 이번 변경으로 영향받지 않았는지 diff로 재확인 (미들웨어 배열에 항목만 추가됐는지).

## 주요 파일
- `supabase/migrations/003_franchise_domain.sql` (신규)
- `src/libs/supabase/queries/portfolios.admin.ts` (복제 템플릿)
- `src/components/admin/PortfolioForm/index.tsx` (이미지 업로드 패턴 템플릿)
- `src/middleware.ts`
- `src/components/admin/Sidebar/index.tsx`
- `src/libs/supabase/queries/content-api-configs.ts`
