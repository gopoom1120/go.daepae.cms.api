---
name: content-api-configs.ts 전체가 createAdminClient()로 동적 공개 API 서빙
description: /api/v1/{resource}를 구동하는 queryConfigList/queryConfigDetail이 RLS를 우회하는 createAdminClient()를 사용 — CLAUDE.md 절대 규칙(공개 read는 createClient() 필수) 위반이지만 2026-09-16 리뷰 시점에 이미 존재하던 아키텍처
type: project
---

`src/libs/supabase/queries/content-api-configs.ts`의 `queryConfigList`/`queryConfigDetail` (각각 `src/app/api/v1/[resource]/route.ts`, `src/app/api/v1/[resource]/[identifier]/route.ts`가 호출)이 `createAdminClient()`(service role, RLS 완전 우회)를 사용해 `statkit_content_api_configs.table_name`이 가리키는 아무 테이블/뷰나 그대로 조회한다.

이는 CLAUDE.md 37번째 줄("Public read 함수에는 createAdminClient() 대신 반드시 createClient()를 사용")과 `.claude/memory/feedback_admin_client_usage.md`가 명시한 절대 규칙을 정면으로 위반하는 구조다. 다만 2026-09-16 리뷰(영업시간 제거 + franchise_popups 추가 + InquiriesTable Select 교체 diff) 시점에 이미 존재하던 코드였고, 이번 diff는 `withComputedFields` 헬퍼 제거만 건드렸을 뿐 admin client 사용 자체는 바꾸지 않아 Major로 분류했지만 BLOCKED 처리하지는 않았다(APPROVED 조건부).

**Why:** 이 아키텍처에서 각 리소스가 노출하지 말아야 할 행(미발행/노출기간 만료 등)을 막는 유일한 방어선은 (1) `table_name`이 정확히 `_public` 뷰를 가리키거나 (2) `filter_column`/`filter_value`가 RLS 정책과 동등한 조건을 재현하는 것뿐이다. admin client가 RLS를 완전히 무시하므로 이 config row가 잘못 설정되면(과거 `portfolio` 드리프트 사례처럼, [[settings_json_inline_hooks_and_portfolio_drift]] 참고) 그대로 전체 테이블이 공개 API로 유출된다. `franchise-popups` 시드 행(마이그레이션 009)은 `filter_column`이 null이라 오직 `table_name = 'franchise_popups_public'`이라는 사실 하나에만 의존한다.

**How to apply:**

- `statkit_content_api_configs`에 새 리소스를 추가하는 diff를 리뷰할 때는 반드시 `table_name`이 마스킹/필터링된 `_public` 뷰(또는 `filter_column`+`filter_value`가 RLS와 동등한 조건)를 가리키는지 확인 — 베이스 테이블을 filter 없이 가리키면 Critical.
- `content-api-configs.ts`의 클라이언트 선택 자체(admin → anon+RLS 전환)를 이번 리뷰의 diff가 직접 건드리지 않는 한, 이 이슈를 이유로 커밋을 BLOCKED하지는 않는다 — 사전 존재 아키텍처 부채로 취급하고 Major로 짚어 후속 조치를 권고하는 선에서 그친다. 다만 이 파일을 직접 수정하는 diff가 오면(예: 클라이언트 교체, queryConfigList/Detail 리팩터) 이 규칙 위반을 Critical로 격상해서 지적할 것. **이 파일이 diff에 처음 등장하는 "최초 커밋"인 경우에도 비교 대상 baseline이 없으므로 Critical로 취급할 것** (2026-09-22 최초 스캐폴드 커밋 리뷰에서 이 기준으로 Critical 판정).

## select_columns=null → `SELECT *` 잠재 위험 (2026-09-22 확인)

`002_statkit_prefix_tables.sql` 시드에서 `orders`/`quotes`/`users`(table_name=`profiles`) 세 리소스는 `is_enabled=false`이면서 `select_columns=null`로 등록되어 있다. `queryConfigList`/`queryConfigDetail`은 `select_columns ?? "*"`로 폴백하므로, 관리자가 `/settings` 화면(또는 `toggleApiConfigAction` 서버 액션)에서 `is_enabled`만 `true`로 토글하는 순간 — 코드 배포나 추가 리뷰 없이 — `profiles`(이메일·role 포함) 또는 `orders`(결제 정보 포함) 테이블 전체 컬럼이 `X-API-Key`만으로 공개된다. `toggleApiConfigAction`(`src/app/(admin)/settings/actions.ts`)에는 리소스별 allowlist나 select_columns 필수화 같은 가드가 전혀 없다.

**How to apply:** `statkit_content_api_configs`에 `select_columns=null`인 민감 테이블(users/orders/quotes 등 PII·결제 정보 포함)이 있는 상태에서 `is_enabled`를 토글 가능하게 하는 UI/액션 diff를 리뷰할 때는, select_columns 화이트리스트 강제 또는 리소스별 allowlist 부재를 Critical로 지적할 것.
