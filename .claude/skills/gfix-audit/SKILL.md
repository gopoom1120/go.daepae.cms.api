---
name: gfix-audit
description: >
  This skill should be used when the user asks to "audit", "analyze the whole project",
  "find duplicates", "check consistency", "what's wrong with the codebase", or
  "clean up the project". Performs a full scan of this single Next.js + Supabase
  repository (src/, supabase/migrations/) to identify duplication, inconsistencies,
  unused code, and architectural issues.
version: 2.0.0
---

# GFix Audit — 저장소 전체 감사

> 이 저장소는 frontend/admin이 분리된 모노레포가 아니라, 루트에 단일 Next.js 앱(`src/`)과
> Supabase 마이그레이션(`supabase/migrations/`)만 있는 구조다. 아래 항목은 그 구조에 맞춰져 있다.
> 동일한 목적의 `/gfix-audit` 슬래시 커맨드(`.claude/commands/gfix-audit.md`)와 내용을 맞춰서
> 관리한다 — 한쪽만 고치면 다른 쪽이 stale해지니 함께 수정할 것.

## 감사 항목

### 1. 패키지 매니저 오염 (yarn 전용 규칙 위반)

- 루트에 `package-lock.json`/`npm-shrinkwrap.json`이 생겼는가? (npm 사용 흔적, 절대 금지)

### 2. Supabase 인라인 쿼리

- `src/app/` 아래 컴포넌트·페이지·API 라우트에서 `.from(테이블명)`으로 직접 테이블을 조회/변경하는가?
- 쿼리는 반드시 `src/libs/supabase/queries/`에서만 작성해야 한다.
- `supabase.auth.getUser()`/`signInWithPassword()`/`signOut()`처럼 세션만 확인·조작하는 auth 호출은 예외(위반 아님) — `.from(` 호출 여부로 구분할 것.

### 3. 경로 오타

- `@/lib/utils`(단수 lib)로 임포트한 곳이 있는가? 정답은 `@/libs/utils`.

### 4. 미사용 코드

- 임포트했지만 사용하지 않는 모듈
- `src/libs/supabase/queries/`의 각 파일이 실제로 다른 곳에서 import되는가? (미사용 쿼리 파일 탐지)

### 5. 하드코딩 탐지

- `src/` 전체에서 직접 작성된 URL(`https://`, `http://`) — `.env` 참조, `*.supabase.co`, OpenAPI 스키마 예시 값(`example:`), 플레이스홀더 텍스트는 제외하고 실제 프로덕션 하드코딩만 판단
- 매직 넘버(의미 없는 숫자 리터럴)

### 6. Supabase RLS 확인

- 데이터를 반환하는 테이블에 RLS가 활성화되어 있는가?
- 공개(무인증) API가 `createAdminClient()`(RLS 우회)를 쓰고 있진 않은가? — 진짜 RLS 우회가 필요한 경우(`content-api-configs.ts`처럼 리소스별 동적 테이블 조회)가 아니라면 `createClient()`(anon key)로 충분한지 확인
- 본인 행을 update할 수 있는 정책에 권한 컬럼(`role` 등)을 막는 `with check`/트리거가 없어 셀프 승격이 가능하지 않은가?

### 7. 문서-코드 정합성

- `CLAUDE.md`가 실제 코드 상태와 어긋나는 서술을 하고 있지 않은가? (예: 이미 구현된 기능을 "아직 미구현"이라고 적어둔 경우)

## 출력 형식

```
=== GFix Audit 결과 ===

[npm 오염] N건
[인라인 쿼리] N건
[경로 오타] N건
[미사용 쿼리 파일] N건
[하드코딩] N건
[RLS/admin client] N건
[문서 stale] N건

총 이슈: N건 | 즉시 수정: N건 | 검토 권장: N건
```

> TODO/FIXME 추적은 `/gfix-debt` 커맨드를 사용한다.
