# statkit.franchise.cms.api ROADMAP

> 헤드리스 CMS 관리자(Admin) + 공개 REST API — 별도 운영되는 고객용 홈페이지에 노출할 콘텐츠를 관리하고, `X-API-Key` 기반 REST API로 그 콘텐츠를 외부에 제공한다.
> 최종 갱신: 2026-08-31

---

## 프로젝트 개요

**비전**: 관리자가 `(admin)` 화면에서 콘텐츠를 CRUD하면, 그 콘텐츠가 `/api/v1/{resource}`로 즉시 공개 API에 반영된다. 리소스 노출 여부는 코드 배포 없이 `/settings`에서 토글한다.

이 저장소는 단일 Next.js 14(App Router) 앱이다 — `frontend/`·`admin/`으로 나뉜 모노레포가 아니라, 이 저장소 자체가 admin이고 별도 저장소의 고객용 홈페이지가 이 앱의 공개 API를 소비하는 구조다.

**전체 타임라인**

| Phase                        | 상태              | 요약                                                                  |
| ---------------------------- | ----------------- | --------------------------------------------------------------------- |
| Phase 1 - 기반 인프라        | 완료              | Next.js 앱, mock-auth 미들웨어, Supabase 3-클라이언트 분리            |
| Phase 2 - statkit 콘텐츠 CMS | 완료              | blog/products/portfolio CRUD, 이미지 업로드, 정렬                     |
| Phase 3 - 공개 REST API      | 완료              | `/api/v1/*` 동적 라우트, API Key 인증, Swagger 문서, `/settings` 토글 |
| Phase 4 - franchise 도메인   | 완료 (2026-08-31) | 매장/메뉴/문의 CRUD, 요일별 영업시간 + 실시간 영업상태 API            |
| Phase 5 - 실사용자 인증 전환 | 미착수            | mock-auth → 실제 Supabase Auth                                        |
| Phase 6 - 데이터 정합성 정리 | 미착수            | users/orders/quotes 드리프트 해소                                     |

---

## 기술 아키텍처

| 구분                      | 내용                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 프레임워크                | Next.js 14.2.3 (App Router), 개발 포트 3001                                                                        |
| 인증(현재)                | `mock-auth` 쿠키 기반 mock 인증. 실제 `@supabase/ssr` 세션 검증(`updateSession()`)은 정의만 있고 미들웨어에 미연결 |
| 상태 관리                 | `@tanstack/react-query` — 인증 상태(`useAuth`/`useUser`)에만 사용. Recoil은 2026-08-31 완전 제거됨                 |
| 콘텐츠 CRUD 패턴          | Next.js Server Actions(`'use server'`) + `router.refresh()`. `useMutation`은 사용하지 않음                         |
| 폼                        | 수동 `useState` + inline 검증이 표준(react-hook-form/zod는 의존성만 설치, admin CRUD 폼에는 미사용)                |
| 스타일                    | Tailwind CSS + shadcn 유틸(`@/libs/utils`) + 일부 Radix 프리미티브(dialog/label/slot)                              |
| 리치 텍스트               | Tiptap (`RichEditor` 공용 컴포넌트)                                                                                |
| 공개 API 문서화           | `@asteasolutions/zod-to-openapi` + `swagger-ui-react` (`/api-docs`)                                                |
| Supabase 클라이언트 3분리 | `client.ts`(브라우저, anon), `server.ts`(RSC, anon+RLS), `admin.ts`(service role, RLS 우회 — 관리자 CRUD 전용)     |

**주요 설계 원칙**

- Supabase 쿼리는 `src/libs/supabase/queries/`에서만 작성 (컴포넌트/페이지에서 직접 호출 금지)
- 신규 콘텐츠 테이블은 `statkit_` 접두사, franchise 도메인은 독립적으로 `franchise_` 접두사 사용
- 마이그레이션 파일(`supabase/migrations/`)은 정의 문서로 유지하되 실제 적용은 Supabase MCP `apply_migration`으로 직접 실행 (CLI 이력 미사용)
- `/api/v1/*` 공개 API는 `X-API-Key` 헤더 인증이며, 리소스 노출 여부는 `statkit_content_api_configs` 테이블 한 행 = 설정 하나로 관리

---

## Phase 1: 기반 인프라 -- 완료

- [x] Next.js 14 App Router 단일 앱 구조
- [x] Supabase 클라이언트 3분리 (`client.ts` / `server.ts` / `admin.ts`)
- [x] mock-auth 미들웨어 (`ADMIN_PATHS` + `config.matcher` 동기화 필요)
- [x] `/api/auth/me` — mock 세션 판별 (`mock-auth` 쿠키 → `MOCK_USER`/`MOCK_PROFILE` 반환)

---

## Phase 2: statkit 콘텐츠 CMS -- 완료

- [x] `statkit_posts`(블로그) CRUD — list/new/edit, 발행 상태, 정렬
- [x] `statkit_products`(상품) CRUD — 유/무료 옵션, 썸네일 업로드
- [x] `statkit_portfolios`(포트폴리오) CRUD — 다중 이미지, 드래그 정렬, 복제
- [x] 이미지 업로드 (Supabase Storage, 리소스별 버킷 분리)

---

## Phase 3: 공개 REST API -- 완료

- [x] `/api/v1/[resource]`, `/api/v1/[resource]/[identifier]` 동적 라우트
- [x] `X-API-Key` 인증 (`validateApiKey`)
- [x] `statkit_content_api_configs` 기반 리소스별 노출 토글 (`/settings` 화면)
- [x] OpenAPI 3.1 스펙 동적 생성(`dynamic-spec.ts`) + Swagger UI(`/api-docs`)

**알려진 제약**: `/api-docs`에 리소스를 노출하려면 ① `statkit_content_api_configs.is_enabled = true` ② `dynamic-spec.ts`의 `TYPED_SLUGS` 맵에 해당 리소스의 zod 스키마 등록, 두 조건이 모두 필요하다 — 서로 다른 코드 경로라 하나만 만족하면 "API는 동작하는데 문서엔 안 보임" 같은 불일치가 생길 수 있다.

---

## Phase 4: franchise 도메인 -- 완료 (2026-08-31)

가맹점(현재 "고품격대패" 단일 브랜드, 왕십리·천호·시흥 3개 매장) 관리 모듈.

- [x] `franchise_stores` / `franchise_menus` / `franchise_inquiries` 테이블 + RLS 3-tier 정책
- [x] `franchise_stores_public` 뷰 — `is_revenue_public=false`인 매장의 매출/수익률을 API 응답에서 마스킹
- [x] 매장/메뉴 admin CRUD (list/new/edit, 드래그 정렬, 이미지 업로드)
- [x] 문의(`franchise_inquiries`) — 관리자 조회/상태변경/CSV 다운로드. 공개 anon insert RLS 세팅 완료(고객용 랜딩페이지는 별도 프로젝트, 아직 미착수)
- [x] `weekly_hours`(jsonb, 요일별 오픈/마감/브레이크타임/라스트오더) + KST 기준 실시간 영업상태(`open_status`) 계산, `/api/v1/franchise-stores` 응답에 매 요청마다 주입
- [x] `/api/v1/franchise-stores`, `/api/v1/franchise-menus` — Swagger 문서 등록 완료

### 미완료

- [ ] 고객용 랜딩페이지(별도 프로젝트) — 5섹션 구성, 문의 폼 공개 제출 UI
- [ ] 브랜드 히어로/스토리 텍스트 관리(간이 CMS) — 이번 스코프에서 의도적으로 제외
- [ ] 멀티 브랜드 확장 (`brand_id`) — 현재 단일 브랜드 전용으로 단순화된 상태

---

## Phase 5: 실사용자 인증 전환 -- 미착수

**목표**: `mock-auth` 쿠키 기반 개발용 인증을 실제 Supabase Auth 세션으로 교체

- [ ] `src/libs/supabase/middleware.ts`의 `updateSession()`을 `src/middleware.ts`에 연결
- [ ] `/api/auth/me`에서 하드코딩된 `MOCK_USER`/`MOCK_PROFILE` 대신 `supabase.auth.getUser()` 호출
- [ ] 관리자 로그인 페이지(`/sign/in`)를 실제 Supabase 이메일/비밀번호 인증과 연결
- [ ] 최초 관리자 승격 절차 정의 (Supabase 대시보드 수동 UPDATE vs 시드 스크립트)

---

## Phase 6: 데이터 정합성 정리 -- 미착수

2026-08-31 실측 조사에서 발견된 드리프트를 해소한다.

- [ ] `statkit_content_api_configs`에 `orders`(table_name: `orders`), `quotes`(table_name: `quote_submissions`), `users`(table_name: `profiles`) 리소스가 `is_enabled=true`로 등록돼 있으나, 실제 DB에 해당 테이블이 **존재하지 않음** — `/api/v1/orders`, `/api/v1/quotes`, `/api/v1/users` 호출 시 500 에러 예상
- [ ] `(admin)/orders`, `(admin)/quotes`, `(admin)/users` 라우트도 동일하게 백엔드 테이블이 없어 실제로는 동작하지 않을 가능성이 높음 — 테이블을 새로 만들거나, 만들기 전까지 `is_enabled=false`로 내려야 함
- [ ] CLAUDE.md의 "알려진 드리프트"(portfolio 시드 행 `table_name` 불일치) 문구는 이미 해결된 상태 — 문서만 갱신되지 않음
- [ ] Storage 버킷(`posts`, `products`) — `storage.objects` RLS 정책이 0개로 확인됨. mock-auth 환경에서 브라우저 업로드는 항상 `anon` role로 실행되므로, 정책이 없으면 업로드가 막혀 있을 가능성 있음 (franchise 버킷은 이 문제를 피하도록 `anon`/`authenticated` 정책을 명시적으로 부여해 새로 만듦)

---

## 리스크 및 미결정 사항

| 항목                                           | 영향도 | 상태          | 비고                                                                                     |
| ---------------------------------------------- | ------ | ------------- | ---------------------------------------------------------------------------------------- |
| mock-auth만 존재, 실제 세션 검증 없음          | 높음   | Phase 5       | 실서비스 전환 전 필수. "세션이 검증된다"고 가정한 코드 작성 금지                         |
| orders/quotes/users 테이블 없음                | 높음   | Phase 6       | `is_enabled=true`로 공개 API까지 노출돼 있어 실제 호출 시 에러 위험                      |
| Storage 정책 미비 가능성 (posts/products 버킷) | 중간   | 관찰 중       | franchise 버킷은 이미 anon/authenticated 정책 포함해 새로 만듦                           |
| 멀티 브랜드 미지원                             | 낮음   | 의도된 단순화 | 저장소명이 `franchise.cms.api`라 향후 확장 가능성은 있으나 현재 스코프 아님              |
| `/api-docs` 이중 게이트                        | 낮음   | 인지됨        | `is_enabled` 토글과 `TYPED_SLUGS` 등록이 별도 조건 — 신규 리소스 추가 시 둘 다 챙겨야 함 |

---

## Future: MVP 이후

- [ ] 고객용 홈페이지(고품격대패 랜딩페이지) 별도 저장소로 구축, franchise 공개 API 연동
- [ ] 멀티 브랜드 지원 (`franchise_brands` + `brand_id` FK)
- [ ] 실 Supabase Auth 기반 OAuth 소셜 로그인
- [ ] `updated_at` 트리거·RLS 패턴을 신규 도메인 추가 시 자동 검증하는 CI 체크

---

## 진행 상황 추적

**마일스톤 체크포인트**

| 마일스톤                   | 기준                                                   | 상태              |
| -------------------------- | ------------------------------------------------------ | ----------------- |
| M1: statkit CMS 완성       | blog/products/portfolio CRUD + 공개 API + Swagger 문서 | 완료              |
| M2: franchise 도메인 완성  | 매장/메뉴/문의 CRUD + 실시간 영업상태 API              | 완료 (2026-08-31) |
| M3: 실사용자 인증 전환     | mock-auth 제거, 실제 Supabase Auth 세션                | 예정              |
| M4: 데이터 정합성 정리     | orders/quotes/users 드리프트 해소, CLAUDE.md 갱신      | 예정              |
| M5: 고객용 랜딩페이지 연동 | franchise 공개 API를 소비하는 별도 홈페이지 배포       | 예정              |

**갱신 규칙**: 태스크 완료 시 해당 체크박스를 `[x]`로 변경하고, 마일스톤 상태를 갱신한다.
