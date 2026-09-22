# Tech Stack

- Next.js 14.2.3 (App Router), React 18, TypeScript 5, Node >=22
- 인증: Supabase Auth (`@supabase/ssr` 0.5, `@supabase/supabase-js` 2.45) — 실연결은 미완료, `mem:core` 참고
- 전역 상태: `@tanstack/react-query` 5.45 (Recoil에서 2026-08-31 마이그레이션 완료, Recoil 잔재 없음)
- UI: shadcn/ui(Radix 기반) + Tailwind CSS v4(`@tailwindcss/postcss`) + `tailwindcss-animate`/`tw-animate-css`
- 리치 텍스트: Tiptap 3.28 (`@tiptap/react`, `starter-kit`, `extension-link/placeholder/underline`)
- 폼: react-hook-form 7 + zod 3 + `@hookform/resolvers`
- 데이터 패칭: react-query + axios
- API 문서: `@asteasolutions/zod-to-openapi` 7 + `swagger-ui-react` 5 (동적 스펙, `/api/openapi.json` → `/api-docs`)
- 토스트: sonner 2
- 배포: Vercel, 로컬 포트 3001 고정(`dev`/`start` 스크립트에 `--port 3001` 명시)
- lucide-react 버전이 `^1.25.0`으로 이례적으로 낮음(다른 최신 프로젝트의 `^0.x` 관례와 다름) — 새 아이콘 추가 시 이 버전의 API 기준으로 확인할 것.
