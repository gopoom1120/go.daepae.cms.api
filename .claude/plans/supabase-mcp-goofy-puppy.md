# 새 Supabase 프로젝트 DB 재설계 + 실 로그인 전환

## Context

MCP가 새 Supabase 프로젝트(`atbmbvmxqzgfdrbkmucy`, 테이블 0개인 빈 프로젝트)에 연결됐다. 기존 `supabase/migrations/`(10개 파일, 883줄)는 구프로젝트 이력이며, 로그인은 `.env`의 `MOCK_EMAIL`/`MOCK_PASSWORD` 문자열 비교 + `mock-auth` 쿠키로 동작하는 완전 가짜 인증이다. 이번 작업의 목적은 (1) 새 Supabase 프로젝트에 실제 운영 스키마를 처음부터 다시 세우고 (2) mock 로그인을 실제 Supabase Auth 기반으로 교체하는 것이다.

탐색 결과 중요한 사실:

- **실제 Admin UI가 쓰는 도메인은 franchise(가맹점) 하나뿐**이다 — `franchise_stores`, `franchise_menus`, `franchise_inquiries`, `franchise_popups` + 범용 API 토글 테이블 `statkit_content_api_configs`. `CLAUDE.md`/`.claude/memory/supabase_schema.md`가 설명하는 블로그·상품·포트폴리오·주문·견적 CMS는 UI가 없는 레거시(`profiles`, `products`, `orders`, `news`, `portfolios`, `quote_submissions`, `statkit_posts`, `statkit_products`)이며, 사용자 확인 결과 **전부 폐기**하기로 했다.
- `src/libs/supabase/queries/profile.ts`, `users.admin.ts`가 참조하는 **`franchise_users` 테이블은 기존 마이그레이션 어디에도 `CREATE TABLE`이 없다** — 과거 대시보드에서 직접 만들고 이력이 누락된 것. 새로 설계하며 정식으로 만든다.
- `src/libs/supabase/middleware.ts`에 실제 세션 검증 `updateSession()`이 이미 완성돼 있는데 `src/middleware.ts`에 연결만 안 돼 있다 — 이번에 연결한다.
- 사용자 결정: 관리자 계정은 **role 기반 다중 관리자** 구조. 새 최고관리자 계정은 `gopoom1120@gmail.com` / `gopoom2024!!`, **Supabase 대시보드에서 수동 생성** 후 Claude가 `role='admin'` 승격 SQL만 실행.

---

## 1. `supabase/migrations/` 전체 교체

기존 10개 파일(`001_initial_schema.sql` ~ `0010_franchise_inquiries_landing_fields.sql`)을 삭제하고, franchise 도메인의 **최종 상태를 바로 반영한** 새 마이그레이션을 처음부터 작성한다(004~008에서 있었던 `business_hours`→`weekly_hours`→삭제 같은 시행착오는 재현하지 않고 최종 컬럼만 반영). storage 정책도 007에서 강화된 최종 형태(update/delete는 `authenticated`만)로 바로 적용한다.

파일 구성(신규):

| 파일                                  | 내용                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_common_functions.sql`            | `public.set_updated_at()` 트리거 함수                                                                                                                             |
| `002_franchise_users.sql`             | `franchise_users` 테이블(아래 스키마) + `handle_new_user()` 트리거(`on_auth_user_created` on `auth.users`) + RLS                                                  |
| `003_franchise_stores.sql`            | `franchise_stores` 테이블 + `franchise_stores_public` 뷰(매출 마스킹) + RLS + 인덱스                                                                              |
| `004_franchise_menus.sql`             | `franchise_menus` 테이블 + RLS + 인덱스                                                                                                                           |
| `005_franchise_inquiries.sql`         | `franchise_inquiries` 테이블(0010 반영된 `region`/`franchise_type` 포함, `message` nullable) + RLS                                                                |
| `006_franchise_popups.sql`            | `franchise_popups` 테이블 + `franchise_popups_public` 뷰 + RLS                                                                                                    |
| `007_statkit_content_api_configs.sql` | `statkit_content_api_configs` 테이블 + RLS + franchise 4종 시드(전부 `is_enabled=false`로 시작, `/settings`에서 토글)                                             |
| `008_storage_buckets.sql`             | `franchise-stores`/`franchise-menus`/`franchise-popups` 버킷 + 정책(read: public, insert: anon+authenticated, update/delete: authenticated만 — 007 강화본 그대로) |

### `franchise_users` (신규 설계, `profiles`(001) 구조를 계승하되 이름을 실제 코드가 참조하는 `franchise_users`로)

```sql
id          uuid primary key references auth.users(id) on delete cascade
email       text not null unique
full_name   text
avatar_url  text
role        text not null default 'user' check (role in ('user','admin'))
created_at  timestamptz not null default now()
updated_at  timestamptz not null default now()
```

- `handle_new_user()`가 `auth.users` insert 시 자동으로 행 생성.
- **주의**: 기존 001 마이그레이션은 신규가입 기본 role을 `'admin'`으로 잡아둔 버그성 설정이었다(권한 상승 위험). 새 설계는 기본값을 `'user'`로 바꾸고, 최고관리자는 생성 후 수동으로 `'admin'`으로 승격한다.
- RLS: 001의 3정책(본인 select/update/insert) 그대로 유지 + `service_role` 전체 허용 정책 추가(다른 테이블과 동일 패턴). `users.admin.ts`/`content-api-configs.ts`는 이미 `createAdminClient()`(service_role)를 쓰므로 관리자 목록 조회·삭제는 RLS 영향 없음.

### `franchise_stores` / `franchise_stores_public` (008 마이그레이션 최종 상태 기준)

컬럼: `id, name, slug, store_type, address, phone, open_date, monthly_revenue, profit_margin_percent, is_revenue_public, description, thumbnail_url, gallery_images, is_published, sort_order, directions, created_at, updated_at`
(`business_hours`/`weekly_hours`/`amenities`/`instagram_url`은 최종적으로 전부 제거됐으므로 처음부터 만들지 않음)

`franchise_stores_public` 뷰: `monthly_revenue`/`profit_margin_percent`는 `is_revenue_public=true`일 때만 노출, `is_published=true`인 행만.

### `franchise_menus` (003 그대로)

`id, category('고기'|'셀프바'), name, description, price, unit, has_surcharge, surcharge_note, is_haccp_certified, thumbnail_url, is_available, sort_order, created_at, updated_at`

### `franchise_inquiries` (003+0010 최종)

`id, name, phone, inquiry_type('방문예약'|'창업상담'|'제휴문의'|'기타'), message(nullable), status('신규'|'처리중'|'완료'), admin_memo, ip_address, user_agent, referer, region, franchise_type, created_at, updated_at`
RLS: `anon` insert 허용(랜딩페이지 공개 제출), 나머지는 `authenticated`/`service_role`.

### `franchise_popups` / `franchise_popups_public` (009 그대로)

`id, title, content, image_url, link_url, start_date, end_date, is_published, sort_order, created_at, updated_at`
공개 뷰는 `is_published=true` + 노출기간(`start_date`/`end_date`) 필터.

### `statkit_content_api_configs` (002 구조 그대로, 시드만 franchise 4종으로 교체)

구조는 기존과 동일(`resource_slug, label, table_name, is_enabled, filter_column, filter_value, filter_is_bool, identifier_column, identifier_type, order_column, order_direction, select_columns`). 시드는 `franchise-stores → franchise_stores_public`, `franchise-menus → franchise_menus`, `franchise-popups → franchise_popups_public` 3종만(문의는 개인정보라 시드 안 함, 003/009와 동일 방침) — 전부 `is_enabled=false`로 시작.

마이그레이션 적용은 `mcp__supabase__execute_sql`로 순서대로 실행하고, 완료 후 `mcp__supabase__list_tables`·`mcp__supabase__get_advisors`(security/performance)로 검증한다.

---

## 2. 최고관리자 계정 생성

1. **사용자가 Supabase 대시보드**(Authentication > Users > Add user)에서 `gopoom1120@gmail.com` / `gopoom2024!!`로 계정 생성 (Auto Confirm 체크해서 이메일 인증 생략).
2. `handle_new_user()` 트리거가 `franchise_users`에 `role='user'`로 자동 삽입.
3. Claude가 `mcp__supabase__execute_sql`로 승격:
   ```sql
   update public.franchise_users set role = 'admin' where email = 'gopoom1120@gmail.com';
   ```

---

## 3. Mock 인증 → 실제 Supabase Auth 전환 (코드 변경)

| 파일                                  | 변경 내용                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/sign/in/actions.ts`          | `MOCK_EMAIL`/`MOCK_PASSWORD` 비교 제거, `createClient()`(`src/libs/supabase/server.ts`)로 `supabase.auth.signInWithPassword({ email, password })` 호출. 실패 시 에러 메시지 반환, 성공 시 `/users`로 redirect(수동 쿠키 세팅 불필요 — `@supabase/ssr` 서버 클라이언트가 세션 쿠키를 자동 관리)                                                                                    |
| `src/middleware.ts`                   | `mock-auth` 쿠키 체크(40행)를 제거하고 `updateSession(request)`(이미 존재, `src/libs/supabase/middleware.ts`) 호출로 교체. 반환된 `user`로 `isAuthenticated` 판단. CORS/OPTIONS 분기 로직은 그대로 유지                                                                                                                                                                           |
| `src/app/(admin)/layout.tsx`          | `cookies().get('mock-auth')` 체크를 `createClient()`(서버) + `supabase.auth.getUser()`로 교체                                                                                                                                                                                                                                                                                     |
| `src/app/api/auth/me/route.ts`        | `MOCK_USER`/`MOCK_PROFILE` 하드코딩 제거. 서버 클라이언트로 `supabase.auth.getUser()` 호출 후, 있으면 `franchise_users`에서 `select *` 해 `profile`로 반환(없으면 401)                                                                                                                                                                                                            |
| `src/hooks/useAuth.ts`                | `signOut()`의 수동 쿠키 삭제(37행)를 `createClient()`(브라우저) + `await supabase.auth.signOut()`으로 교체                                                                                                                                                                                                                                                                        |
| `src/app/(admin)/profile/page.tsx:64` | `isMock` 분기 제거 — `franchise_users`가 실존하므로 `updateProfile` 항상 호출                                                                                                                                                                                                                                                                                                     |
| `src/app/api/debug-env/route.ts`      | 삭제 — mock 전용 디버그 라우트, 더 이상 불필요                                                                                                                                                                                                                                                                                                                                    |
| `.env`                                | `MOCK_EMAIL`/`MOCK_PASSWORD` 제거. `NEXT_PUBLIC_SUPABASE_URL=https://atbmbvmxqzgfdrbkmucy.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<위에서 조회한 anon key>`로 교체. `SUPABASE_SERVICE_ROLE_KEY`는 **Claude가 `.env` 파일에 직접 접근할 권한이 차단돼 있어** 사용자가 Supabase 대시보드(Settings > API)에서 복사해 직접 넣어야 함(구체적 값과 교체 방법은 실행 단계에서 안내) |

`src/libs/supabase/queries/profile.ts`(`franchise_users` 대상)와 `users.admin.ts`는 테이블이 정식으로 생기므로 **코드 변경 없이 그대로 동작**한다.

---

## 4. 타입 생성 (선택이지만 권장)

현재 Supabase 생성 타입 파일이 프로젝트에 없다(`createClient<Database>()` 미사용). 마이그레이션 적용 후 `mcp__supabase__generate_typescript_types`로 `src/types/database.types.ts` 생성 — 새 스키마 컬럼명 오타를 컴파일 타임에 잡을 수 있어 이번 대규모 변경과 함께 하기 좋은 타이밍. 기존 클라이언트 팩토리(`admin.ts`/`client.ts`/`server.ts`/`middleware.ts`)에 제네릭 타입 적용은 별도 후속 작업으로 남겨도 무방.

---

## 5. 검증

1. `mcp__supabase__list_tables` / `get_advisors`로 스키마·RLS 이상 없는지 확인.
2. Supabase 대시보드에서 `gopoom1120@gmail.com` 계정 생성 확인 후 `franchise_users` role 승격 SQL 실행 결과 확인.
3. `yarn dev`로 로컬 구동 → `/sign/in`에서 새 계정으로 로그인 → `/users`로 정상 리다이렉트 → 로그아웃 시 `/sign/in`으로 이동 확인.
4. 미인증 상태로 `/settings`, `/franchise/inquiries` 등 admin 경로 직접 접근 시 `/sign/in`으로 막히는지 확인.
5. `/settings`에서 `franchise-popups` 리소스를 활성화하고 `X-API-Key` 헤더로 `/api/v1/franchise-popups` 호출해 공개 API 정상 노출 확인.
6. `franchise_inquiries` 공개 제출(랜딩 문의 폼 대응 API)이 `anon` insert로 여전히 동작하는지 확인.
