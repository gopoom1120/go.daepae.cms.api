# Conventions

## Supabase 쿼리 위치 (절대 규칙)
- `select`/`insert`/`update`/`delete`는 반드시 `src/libs/supabase/queries/` 안에서만 작성. 컴포넌트/페이지에서 `createClient()` 직접 호출 금지.
- 쿼리 파일은 도메인별 분리(`profile.ts`, `users.ts`, `orders.ts`, `products.ts`, `posts.ts`/`posts.server.ts`/`posts.admin.ts` 등). 같은 리소스라도 클라이언트 종류(anon/브라우저 vs anon/서버 vs service_role)에 따라 파일을 분리하는 패턴(`posts.*`)을 따를 것.

## Server Action 규칙 (절대 규칙)
- `'use server'` 파일에는 뮤테이션(`createXxx`/`updateXxx`/`deleteXxx`)만 정의. 읽기 함수(`getAllXxx`/`getXxxById`) 금지 — 불필요한 HTTP POST 엔드포인트 생성 방지. 읽기는 Server Component에서 `queries/`를 직접 import.

## Supabase 클라이언트 선택 기준
| 클라이언트 | 키 | 용도 |
|---|---|---|
| `client.ts` | anon | `'use client'` 컴포넌트 |
| `server.ts` | anon | Server Component, 공개 읽기 |
| `admin.ts` | service_role | Server Action 뮤테이션, RLS 우회 admin 작업 |

- 쓰기는 항상 `admin.ts` 경유(anon key는 RLS에 차단됨).
- **공개 API(`/api/v1/*`)의 읽기에는 `admin.ts` 금지** — RLS 우회로 비공개 데이터 노출 위험. 반드시 `server.ts`(anon + RLS) 사용. 상세 기준: `.claude/memory/feedback_admin_client_usage.md`.

## 인증 상태 접근
- React Query의 `authQueryKey`(`['auth','me']`)를 직접 구독 금지. 항상 `useAuth()`/`useUser()` 훅 경유(`src/hooks/`).
- mock 인증 판별: `profile.id === 'mock-user-id'`(`isMock`) 체크 후 Supabase 호출 스킵 — 단 Server Action+`admin.ts` 조합은 RLS 우회라 이 체크 불필요.

## 경로/네이밍
- `@/` → `src/`. shadcn utils는 기본값이 아닌 **`@/libs/utils`**(`@/lib/utils` 아님) — 새 shadcn 컴포넌트 추가 후 import 경로 수정 필수.
- 신규 콘텐츠 테이블은 `statkit_` 접두사(예외: `franchise_` 도메인).

## Client/Server Component 분리
- Provider(`QueryClientProvider` 등) 컨텍스트를 구독하는 Client Component를, 그 Provider 상위 트리에 있는 다른 Client Component가 직접 import하면 Next.js가 같은 번들로 묶어 컨텍스트를 못 찾는 런타임 에러 발생. Sidebar류는 Server Component(layout.tsx)에서 렌더링하고 상태는 React Context로 공유(`MobileMenuContext` 패턴).
- 페이지는 Server Component 유지, 인터랙션 부분만 별도 Client Component로 분리(`XxxTable.tsx`/`XxxForm.tsx` + Server Action + `router.refresh()`/`router.push()`).

## UI
- 새 화면/컴포넌트/스타일 작업 시 `docs/design.md`(shadcn 토큰 레이어 + 어드민 전용 흑백/회색 아이덴티티 레이어) 필수 준수. 다크 모드는 팔레트 클래스마다 `dark:` 변형을 명시해야 동작(Tailwind v4 + next-themes 조합, 자동 적용 안 됨).
