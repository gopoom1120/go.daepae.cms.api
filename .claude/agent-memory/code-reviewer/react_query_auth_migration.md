---
name: react query auth migration
description: Recoil → @tanstack/react-query 인증 상태 마이그레이션(2026-08-31) 리뷰 결과 및 signOut 캐시 무효화 이슈
type: project
---

2026-08-31, `useAuth()`/`useUser()`의 전역 인증 상태 관리가 Recoil(`sessionAtom`, `userProfileAtom` 등)에서 `@tanstack/react-query`로 전환됨. `authQueryKey = ["auth", "me"]`로 `/api/auth/me`를 캐싱하는 단일 쿼리 구조. `RecoilProvider.tsx`, `AuthProvider/index.tsx`, `src/store/**`(atoms/selectors) 삭제 확인, 죽은 import 없음 확인(grep 전수 검사). 훅 외부 시그니처(`{user, loading, profile, isAuthenticated, isAdmin, signOut}` / `{profile, setProfile}`)는 유지되어 소비 컴포넌트(Sidebar, AdminShell, SettingsClientSection, profile/page.tsx) 무수정.

**Why:** Recoil이 2024-02 이후 배포 중단 상태였고 실사용 범위가 `/api/auth/me` 캐싱뿐이라 서버 상태 라이브러리(react-query, 이미 미사용 상태로 설치돼 있었음)로 대체. [[project_scaffold_context]]에 기록된 "미사용 의존성: axios, zod, @tanstack/react-query" 항목 중 react-query는 이제 사용됨(axios, zod는 여전히 미사용 — 확인 필요할 수도).

**How to apply:**

- 이후 이 프로젝트에서 "Recoil"을 언급하는 리뷰/제안은 하지 말 것. 상태 관리는 React Query(`authQueryKey`)로 통일됨. `.claude/memory/architecture.md`, `project-overview.md`, `conversation-insights.md`, `CLAUDE.md` 모두 갱신 완료 확인(2026-08-31).
- ~~`src/hooks/useAuth.ts`의 `signOut()`이 `invalidateQueries`를 호출하지 않던 문제~~ → 2026-09-24 확인 결과 `signOut()`이 `setQueryData` 직후 `queryClient.invalidateQueries({queryKey: authQueryKey})`를 호출하도록 수정 완료. 더 이상 이슈 아님(과거 Major 해소).
- `useUser.ts`의 `setProfile`이 캐시 셰이프(`{user: unknown, profile: UserProfile|null}`)를 `useAuth.ts`의 `AuthMeResponse`와 별도로 구조적 타입으로 재선언 중 — 둘이 어긋나도 컴파일 에러 안 남 (Minor, `queryOptions()` 헬퍼로 통합 권장했음, 아직 미반영).
- 여러 컴포넌트가 동일 `authQueryKey`로 독립 `useQuery` 호출해도 React Query 표준 dedup으로 중복 fetch 없음 — 이 패턴 자체는 문제없다고 확인됨(재리뷰 시 재검증 불필요).
