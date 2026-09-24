---
name: queries 컨벤션 정리 diff (auth-me.ts, franchise-popups.public.ts) 리뷰 결과
description: 2026-09-24 인라인 쿼리를 src/libs/supabase/queries/로 이동한 diff 리뷰 — anon-key 전환 안전성 확인 패턴 + auth-me.ts의 .single() 에러 스왈로우 이슈
type: project
---

2026-09-24, `src/app/api/auth/me/route.ts`와 `src/app/api/v1/public/franchise-popups/route.ts`의 인라인 쿼리를 각각 `src/libs/supabase/queries/auth-me.ts`(`getAuthenticatedUser`), `src/libs/supabase/queries/franchise-popups.public.ts`(`getPublicFranchisePopups`)로 이동. `franchise-popups.public.ts`는 이 김에 `createAdminClient()`(RLS 우회) → `createClient()`(anon key, RLS 적용)로 교체.

**Why:** CLAUDE.md 절대 규칙(쿼리는 queries/ 파일에서만, public read는 admin client 금지)을 지키기 위한 정리 작업. [[content_api_configs_admin_client_architecture]]에 기록된 `content-api-configs.ts`의 admin client 사용은 이번 diff에서 의도적으로 제외됨(동적 리소스라 리소스별 RLS 검증이 필요한 별도 작업으로 타당하게 판단, scope 축소 아님).

**How to apply:**

- **anon-key 전환 안전성 판단 패턴**: `franchise_popups` 테이블은 `security_invoker = true`인 `franchise_popups_public` 뷰(`supabase/migrations/006_franchise_popups.sql`)를 통해서만 공개 조회되고, 베이스 테이블에 `using (is_published = true)`인 `to` 절 없는(=모든 role 포함 anon) RLS 정책이 걸려 있어 뷰의 WHERE절과 RLS가 이중으로 방어함. 이런 구조에서 admin client → anon client 전환은 노출 범위를 넓히지 않고 오히려 최소 권한 원칙에 부합 — 안전하다고 확인(2026-09-24). 앞으로 유사한 `_public` 뷰 + `security_invoker` + RLS 정책 조합의 admin→anon 전환 diff를 리뷰할 때는 이 패턴(뷰 정의 + RLS 정책 두 곳을 대조)으로 검증할 것.
- **`getAuthenticatedUser()`의 `.single()` 이슈**: `franchise_users`를 `.select("*").eq("id", user.id).single()`로 조회하면서 `error`를 전혀 확인하지 않고 `profile: profile ?? null`로 흡수함. 결과적으로 "행 없음"(트리거 실패 등) 케이스는 `.maybeSingle()`과 동일하게 동작하지만, 그 외 모든 에러(권한 문제, 커넥션 장애 등)도 구분 없이 조용히 `profile: null`로 삼켜짐 — `console.error` 로깅이 전혀 없음. 같은 프로젝트의 `franchise-popups.admin.ts`(`getFranchisePopupByIdAdmin`)는 `error.code === "PGRST116"`만 별도 처리하고 나머지는 `console.error` 후 throw하는 패턴을 쓰고 있어, `auth-me.ts`는 이 컨벤션에서 벗어남. 다만 이 로직 자체는 리팩토링 이전과 동일(신규 회귀 아님)하고, profile null은 fail-closed(권한 축소) 방향이라 보안 위험은 아니므로 2026-09-24 리뷰에서는 Minor(관측성 문제)로 분류하고 APPROVED — 다음에 이 파일을 다시 만지는 diff가 오면 `.maybeSingle()` + 에러 로깅 추가를 권고할 것.
- `signOut()` invalidateQueries 이슈는 이 시점에 이미 해소되어 있었음 — [[react_query_auth_migration]] 참고.
