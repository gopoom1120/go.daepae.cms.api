# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 상세 내용은 `.claude/memory/` 디렉토리의 각 파일을 참조한다.

## 프로젝트 정의

**statkit.cms.api**는 방문자용 홈페이지가 아니라, 별도로 운영되는 일반 홈페이지(고객용 프론트엔드)에 노출할 콘텐츠를 관리하는 **헤드리스 CMS 관리자(Admin) 서비스**다.

- 관리자가 `(admin)` 라우트 그룹(블로그·상품·포트폴리오·주문·견적·회원)에서 콘텐츠를 CRUD한다.
- `/settings`에서 리소스별로 `/api/v1/{resource}` REST API 노출 여부를 토글한다 (`statkit_content_api_configs` 테이블 한 행 = 노출 설정 하나, 코드 배포 불필요).
- 활성화된 콘텐츠는 `X-API-Key` 인증 기반 공개 REST API(`/api/v1/*`)로 노출되고, 외부의 일반 홈페이지가 이를 호출해 화면에 표시한다.
- 새 기능을 만들 때는 이 정의를 기준으로 판단한다: 관리자 화면 기능인가, 공개 API 기능인가에 따라 인증·클라이언트·RLS 취급이 달라진다.

## 빠른 참조

| 주제                                                                     | 파일                                                                                                                                                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 프로젝트 개요 · 기술 스택 · 구현 상태                                    | [`.claude/memory/project-overview.md`](.claude/memory/project-overview.md)                                                                                                             |
| 인증 레이어 · React Query 상태 구조 · Supabase 클라이언트                | [`.claude/memory/architecture.md`](.claude/memory/architecture.md)                                                                                                                     |
| **Supabase 쿼리 작성 규칙 (절대 규칙)**                                  | [`.claude/memory/data-access-rules.md`](.claude/memory/data-access-rules.md)                                                                                                           |
| yarn 전용 · 명령어 · 환경변수 · 스키마                                   | [`.claude/memory/dev-setup.md`](.claude/memory/dev-setup.md)                                                                                                                           |
| isMock 패턴 · Client Component 번들링 함정 · 사이드바 패턴               | [`.claude/memory/conversation-insights.md`](.claude/memory/conversation-insights.md)                                                                                                   |
| 동적 REST API용 CORS 설정 (`/api/v1/*`)                                  | [`.claude/memory/cors-setup.md`](.claude/memory/cors-setup.md)                                                                                                                         |
| Supabase 테이블 전체 DDL (콘텐츠 테이블 포함)                            | [`.claude/memory/supabase_schema.md`](.claude/memory/supabase_schema.md)                                                                                                               |
| 코드 리뷰 피드백 (admin client 사용 기준 · upsert 배치)                  | [`.claude/memory/feedback_admin_client_usage.md`](.claude/memory/feedback_admin_client_usage.md), [`.claude/memory/feedback_upsert_batch.md`](.claude/memory/feedback_upsert_batch.md) |
| **UI/디자인 시스템 (shadcn/ui 아이덴티티, 색상·라디우스·컴포넌트 규칙)** | [`docs/design.md`](docs/design.md)                                                                                                                                                     |

## 핵심 규칙 요약

- **패키지 매니저**: `yarn`만 사용. `npm` 절대 금지.
- **Supabase 쿼리**: `src/libs/supabase/queries/` 파일에서만 작성. 컴포넌트·페이지에 인라인 쿼리 금지.
- **인증 상태 접근**: `@tanstack/react-query`(`authQueryKey`) 직접 구독 금지. `useAuth()` / `useUser()` 훅 사용.
- **shadcn utils 경로**: `@/libs/utils` (`@/lib/utils` 아님).
- **목 인증**: `profile.id === 'mock-user-id'` 체크 후 Supabase 호출 건너뜀. 이와 별개로 `src/middleware.ts`도 현재 `mock-auth` 쿠키로만 라우트를 보호하는 개발용 인증이다 — 실제 Supabase 세션 검증(`updateSession()`)은 아직 미들웨어에 연결되지 않았으니 "세션이 이미 검증된다"고 가정한 코드를 작성하지 말 것.
- **공개 REST API (`/api/v1/*`)**: 관리자 세션이 아닌 `X-API-Key` 헤더로 인증한다 (`INTERNAL_API_KEY` 환경변수). Public read 함수에는 `createAdminClient()`(RLS 우회) 대신 반드시 `createClient()`(anon key + RLS)를 사용한다.
- **콘텐츠 테이블 명명 규칙**: 신규 콘텐츠 테이블은 `statkit_` 접두사를 따른다 (`statkit_posts`, `statkit_products`, `statkit_portfolios`(관리자 CRUD 기준), `statkit_content_api_configs`).
- **⚠️ 알려진 드리프트**: `statkit_content_api_configs`의 `portfolio` 시드 행은 `table_name = 'portfolios'`(접두사 없음)인데 실제 관리자 CRUD는 `statkit_portfolios`를 쓴다. `portfolio` 리소스의 `is_enabled`를 켜기 전에 `table_name`을 `statkit_portfolios`로 맞춰야 한다.
- **UI/컴포넌트 작업**: 새 화면·컴포넌트를 만들거나 스타일을 수정할 때는 반드시 [`docs/design.md`](docs/design.md)의 디자인 시스템(shadcn/ui 토큰 레이어 + 어드민 화면 고유 흑백/회색 아이덴티티 레이어, radius·타이포·컴포넌트 규칙)을 따른다. 새 shadcn 컴포넌트는 `npx shadcn@latest add <component>`로 추가한다(설치 후 `package-lock.json`이 생기지 않았는지 확인 — npm 절대 금지 규칙).
