# 팝업 공지 (franchise_popups) 신규 리소스 추가

## Context

사용자는 가맹점 관리 CMS에 "팝업 이미지 및 텍스트를 등록할 수 있는" 새 관리자 페이지를 요청했다. 공지사항처럼 여러 건을 등록할 수 있어야 하고, DB에는 `franchise_` 접두사를 쓰는 테이블을 새로 만들어야 한다.

AskUserQuestion으로 확정한 세부 요구사항:
- 리소스명: `franchise_popups` ("팝업 공지"), 관리자 경로 `/franchise/popups`
- 클릭 시 이동할 링크(`link_url`) 필드 포함
- 노출 기간(`start_date`~`end_date`) 필드 포함 — 기간이 지나면 공개 API에서 자동으로 빠져야 함
- `statkit_content_api_configs`에 시드해서 향후 `/settings`에서 공개 API로 켤 수 있게 준비 (기존 franchise-stores/menus와 동일하게 `is_enabled=false`로 시작)

이 저장소는 franchise 도메인에 이미 `franchise_stores`(매장현황)와 `franchise_menus`(메뉴) 두 개의 리소스가 동일한 아키텍처 패턴으로 구현되어 있다. `franchise_menus`가 이번 요구사항(단일 이미지 + 텍스트 + sort_order + 여러 건 CRUD)과 구조적으로 가장 가깝기 때문에, 새 리소스는 **`franchise_menus`의 파일 구조를 그대로 복제**해서 만든다. 노출 기간 자동 필터링은 `franchise_stores_public`(매출 마스킹 뷰) 패턴을 그대로 재사용해 `franchise_popups_public` 뷰로 구현한다 — 이렇게 하면 범용 공개 API 쿼리 코드(`src/libs/supabase/queries/content-api-configs.ts`)를 전혀 건드릴 필요가 없다.

## DB 마이그레이션

새 파일: `supabase/migrations/009_franchise_popups.sql` (참고: `003_franchise_domain.sql`의 franchise_menus/franchise_stores 블록, `007_franchise_storage_policy_tighten.sql`의 스토리지 정책 강화 패턴)

1. **`franchise_popups` 테이블**
   ```
   id           uuid        pk default gen_random_uuid()
   title        text        not null
   content      text                          -- 팝업 본문 텍스트
   image_url    text                          -- 팝업 이미지
   link_url     text                          -- 클릭 시 이동 링크 (선택)
   start_date   date                          -- 노출 시작일 (선택)
   end_date     date                          -- 노출 종료일 (선택)
   is_published boolean     not null default false
   sort_order   integer     not null default 0
   created_at   timestamptz not null default now()
   updated_at   timestamptz not null default now()
   ```
   인덱스: `sort_order`, `is_published`. `franchise_menus_updated_at` 트리거와 동일하게 `public.set_updated_at()` before update 트리거 부착.

2. **RLS** — 003번과 동일한 3종 정책: `franchise_popups_public_read`(`is_published = true`), `franchise_popups_admin_all`(authenticated), `franchise_popups_service_all`(service_role).

3. **`franchise_popups_public` 뷰** (기간 만료 자동 필터링, `franchise_stores_public` 패턴 재사용):
   ```sql
   create view public.franchise_popups_public
   with (security_invoker = true) as
   select id, title, content, image_url, link_url, start_date, end_date, sort_order, created_at
   from public.franchise_popups
   where is_published = true
     and (start_date is null or start_date <= current_date)
     and (end_date is null or end_date >= current_date);
   ```

4. **`statkit_content_api_configs` 시드**: `resource_slug='franchise-popups'`, `table_name='franchise_popups_public'`(뷰를 바로 조회 — filter_column 불필요, stores와 동일), `is_enabled=false`, `order_column='sort_order'`, `select_columns='id,title,content,image_url,link_url,start_date,end_date,sort_order,created_at'`.

5. **Storage 버킷** `franchise-popups` (public). 정책은 003이 처음에 만들고 007이 뒤늦게 좁힌 실수를 반복하지 않도록, 처음부터 007의 최종 형태로 생성: read=public, insert=anon+authenticated, **update/delete=authenticated 전용**.

마이그레이션 작성 후 `mcp__supabase__apply_migration`으로 원격 프로젝트에 즉시 적용하고, `mcp__supabase__get_advisors`(security)로 새로 생긴 이슈가 없는지 확인한다.

## 애플리케이션 코드 (franchise_menus 패턴 복제)

- **타입** `src/types/franchise-popup.ts` — `FranchisePopup`(DB 전체 필드) / `FranchisePopupFormInput`(폼 필드, null 대신 `""`) 두 인터페이스. `franchise-menu.ts` 패턴 그대로.
- **쿼리** `src/libs/supabase/queries/franchise-popups.admin.ts` — `franchise-menus.admin.ts`를 원형으로, `TABLE = "franchise_popups"`. `toFranchisePopup`/`toFranchisePopupPayload` 매핑 함수 + `getAllFranchisePopups`/`getFranchisePopupByIdAdmin`/`createFranchisePopup`/`updateFranchisePopup`/`deleteFranchisePopup`/`updateFranchisePopupsSortOrder` 6개 함수. 모두 `createAdminClient()` 사용(data-access-rules.md 절대 규칙), 목록은 `sort_order asc, created_at desc` 정렬.
- **폼 컴포넌트** `src/components/admin/FranchisePopupForm/index.tsx` — `FranchiseMenuForm/index.tsx`를 원형으로:
  - 제목(`title`, 필수), 본문(`content`, textarea)
  - 이미지 업로드: `FranchiseMenuForm`의 `uploadThumbnailToStorage` 패턴 그대로, 버킷명만 `franchise-popups`로 교체(`image_url` 필드, 미리보기/변경/제거 UI 동일)
  - 링크(`link_url`, text input, placeholder `https://...`)
  - 노출 기간: `start_date`/`end_date` (`type="date"` input 2개, 매장 폼의 주소/연락처처럼 2열 grid). 저장 전 `end_date < start_date`면 `AlertDialog`로 안내(기존 영업시간 검증 로직과 같은 스타일의 가벼운 검증).
  - 발행 토글(`is_published`, "발행 (프론트에 노출)") — 모바일 액션바 + 데스크탑 우측 패널 체크박스, `FranchiseStoreForm`과 동일 문구.
- **admin 라우트** `src/app/(admin)/franchise/popups/` 아래 `franchise_menus`의 7개 파일을 그대로 복제해 리소스명만 치환:
  - `page.tsx` (목록, `getAllFranchisePopups` 호출, 타이틀 "가맹점 팝업 공지")
  - `actions.ts` (`"use server"`, create/update/delete/sortOrder 4개 wrapper)
  - `FranchisePopupsTable.tsx` (`FranchiseMenusTable.tsx` 복제 — 드래그 정렬, 이미지 썸네일, 발행 여부 배지, 편집/삭제 드롭다운)
  - `new/page.tsx`, `new/NewFranchisePopupForm.tsx`
  - `[id]/edit/page.tsx`, `[id]/edit/EditFranchisePopupForm.tsx`
- **사이드바** `src/components/admin/Sidebar/index.tsx`의 `NAV_ITEMS` 배열(21~31행) 30행 뒤에 `{ label: "가맹점 팝업 공지", href: "/franchise/popups" },` 한 줄 추가.
- **OpenAPI 문서** (기존 franchise-stores/menus 둘 다 문서화되어 있어 동일 패턴 유지):
  - `src/libs/openapi/schemas/franchise-popups.schema.ts` — `franchise-menus.schema.ts` 원형, `FranchisePopupSchema`(title/content/image_url/link_url/start_date/end_date/sort_order/created_at) + 목록/상세 응답 스키마 + `registerFranchisePopupPaths`(GET 목록/GET 단건).
  - `src/libs/openapi/dynamic-spec.ts`에 import 추가 + `TYPED_SLUGS`에 `"franchise-popups": registerFranchisePopupPaths` 한 줄 등록.

## 건드리지 않는 것

- `src/middleware.ts` — `/franchise` prefix가 이미 모든 하위 라우트를 보호하므로 수정 불필요.
- `src/app/api/v1/[resource]/route.ts` 등 공개 API 라우트 코드 — config-driven이라 신규 리소스 추가 시 코드 변경 없음.
- `ApiConfigCard`의 `SLUG_META` — franchise-stores/menus도 여기 없이 fallback으로 잘 동작 중이므로 popups도 동일하게 fallback에 맡긴다(불필요한 추가 변경 지양).

## 검증

1. `yarn tsc --noEmit`으로 타입 오류 없는지 확인.
2. `mcp__supabase__apply_migration`으로 009 마이그레이션을 원격 DB에 적용 후 `mcp__supabase__list_tables`로 `franchise_popups`/`franchise_popups_public` 생성 확인, `get_advisors`로 새 보안 이슈 없는지 확인.
3. `/run` 스킬(또는 `yarn dev`)로 로컬 서버 기동 후 브라우저로 `/franchise/popups` 접속 — 새 팝업 등록(이미지+텍스트+링크+기간), 목록 표시, 드래그 정렬, 수정, 삭제까지 한 사이클 직접 확인.
4. `/settings` 페이지에서 "팝업 공지" API 카드가 자동으로 나타나는지 확인(토글은 켜지 않음, `is_enabled=false` 유지).
