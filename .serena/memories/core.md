# Core

statkit.franchise.cms.api — 헤드리스 CMS 관리자(Admin) 서비스. 방문자용 홈페이지가 아니라, 외부 일반 홈페이지에 노출할 콘텐츠를 관리하는 백오피스 + 동적 공개 REST API(`/api/v1/*`) 프로바이더.

이 리포는 이미 `CLAUDE.md`(루트)와 `.claude/memory/*.md`에 상세하고 최신 상태로 유지되는 프로젝트 문서를 갖고 있다. Serena 메모리는 이를 대체하지 않고 탐색 진입점 역할만 한다 — 상세 규칙은 항상 원본 파일을 직접 열어 확인할 것(중복 방지, drift 방지).

## 소스 맵
```
src/app/(admin)/   # 관리자 CRUD 라우트 그룹 (블로그·상품·포트폴리오·주문·견적·회원·설정)
src/app/api/       # API 라우트: /api/v1/[resource] (공개), /api/auth/me (mock), /api/openapi.json
src/app/api-docs/  # Swagger UI
src/app/sign/      # 로그인
src/middleware.ts  # mock-auth 쿠키 기반 라우트 보호 + CORS(OPTIONS) 처리
src/libs/supabase/ # client.ts(anon)/server.ts(anon)/admin.ts(service_role)/middleware.ts(미연결)/queries/
src/hooks/         # useAuth(), useUser() — React Query 기반 인증 상태
src/components/    # shadcn/ui + 어드민 전용 컴포넌트(AdminShell, Sidebar 등)
docs/design.md     # UI/디자인 시스템 (필수 참조: shadcn 토큰 레이어 + 어드민 흑백 아이덴티티 레이어)
supabase/backups/  # 실제 고객 PII 포함 — 다루는 방식 주의 (private repo, 사용자 승인됨)
```

## 프로젝트 전역 불변 사실 (2026-09 기준)
- **인증은 전부 mock**: `src/middleware.ts`, `src/app/page.tsx`, `/api/auth/me` 모두 `mock-auth` 쿠키/`mock-user-id`로 동작. 실 Supabase 세션(`updateSession()`, `src/libs/supabase/middleware.ts`)은 정의만 있고 미연결. "세션이 검증된다"고 가정하지 말 것.
- **콘텐츠 노출 토글**: `statkit_content_api_configs` 테이블 한 행 = `/api/v1/{resource}` 노출 여부. 코드 배포 불필요, `/settings` 화면에서 토글.
- **알려진 드리프트**: `statkit_content_api_configs`의 `portfolio` 시드 행 `table_name`이 `portfolios`(접두사 없음)로 남아있을 수 있음 — 실제 CRUD 테이블은 `statkit_portfolios`. `portfolio` 리소스의 `is_enabled`를 켜기 전 `table_name` 일치 확인 필요.
- 새 콘텐츠 테이블은 `statkit_` 접두사 (예외: `franchise_` 접두사 리소스 — franchise 도메인 전용, 3리소스 단일 브랜드 스코프).

## 참조
- `mem:tech_stack` — 프레임워크/버전/의존성
- `mem:conventions` — Supabase 쿼리 위치 규칙, Server Action 규칙, admin/anon 클라이언트 선택 기준, 경로 별칭
- `mem:suggested_commands` — yarn 명령어, git 훅
- `mem:task_completion` — 작업 완료 전 체크리스트
