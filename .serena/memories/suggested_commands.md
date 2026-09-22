# Suggested Commands

패키지 매니저는 **yarn 전용** — npm 사용 절대 금지(락파일 충돌, 프로젝트 규칙).

```bash
yarn dev      # 개발 서버 :3001
yarn build    # 프로덕션 빌드
yarn start    # 프로덕션 서버 :3001
yarn lint     # next lint
yarn pretty   # prettier --write 'src/**/*.{ts,js,tsx,jsx}'
npx shadcn@latest add <component>   # shadcn 컴포넌트 추가 (yarn 아님, npx 사용 — 설치 후 package-lock.json 생성 안 됐는지 확인 필수)
```

## Git 훅 (Husky, `.husky/`)
- `pre-commit`: `git diff --cached`에 `main/` 경로 변경이 있으면 `yarn --cwd main build` 선실행 후 `yarn lint-staged`. **`yarn test`는 주석 처리되어 비활성 상태**(테스트 인프라 미구성) — CLAUDE.md류 문서에 "pre-commit이 테스트를 실행한다"고 적혀 있어도 실제로는 실행되지 않음.
- `pre-push`: 현재 브랜치가 `master`/`dev`/`prod`면 push 차단(주의: 이 리포의 기본 브랜치는 `main`이라 이 훅은 사실상 걸리지 않음 — `main` 자체는 보호되지 않으므로 직접 push 가능).

Darwin 환경 특이사항 없음(표준 유닉스 셸 명령과 동일하게 동작).
