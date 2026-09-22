# Task Completion Checklist

코드 변경 후 완료로 간주하기 전에:

1. `yarn lint` — ESLint(`eslint-config-next` + prettier 통합) 통과 확인.
2. `yarn pretty` — Prettier 포맷 적용(`src/**/*.{ts,js,tsx,jsx}`).
3. `yarn build` — 타입 에러/빌드 실패 여부 확인(특히 Server/Client Component 경계, Supabase 타입 변경 시).
4. **자동 테스트 없음** — `yarn test` 스크립트 자체가 package.json에 없고 pre-commit 훅에서도 주석 처리되어 있음(테스트 인프라 미구성). 테스트 통과를 완료 기준에 넣지 말 것; 대신 UI 변경은 `yarn dev`로 브라우저에서 직접 확인.
5. Supabase 쿼리를 추가/수정했다면 `src/libs/supabase/queries/` 배치 규칙(`mem:conventions`)과 RLS 우회 여부(admin vs anon client)를 재확인.
6. 커밋 전 `git status`로 의도치 않은 파일(예: `.env.local`, `tsconfig.tsbuildinfo`, `.next/`)이 스테이징되지 않았는지 확인 — 이 리포는 pre-commit이 실제 테스트를 돌리지 않으므로 수동 확인이 더 중요함.
