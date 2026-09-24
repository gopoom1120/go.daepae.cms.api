---
description: 저장소 전체를 감사하여 중복, 불일치, 미사용 코드를 탐지합니다
allowed-tools: Read, Glob, Grep, Bash
---

## 실행 순서

> 이 저장소는 frontend/admin이 분리된 모노레포가 아니라, 루트에 단일 Next.js 앱(`src/`)과
> Supabase 마이그레이션(`supabase/migrations/`)만 있는 구조다. 아래 단계는 그 구조에 맞춰져 있다.

### 1단계: 저장소 구조 파악

!`find . -path ./node_modules -prune -o -path ./.next -prune -o -name "package.json" -print`

### 2단계: npm 오염 탐지 (yarn 전용 규칙 위반)

!`find . -maxdepth 1 -name "package-lock.json" -o -maxdepth 1 -name "npm-shrinkwrap.json"`

### 3단계: Supabase 인라인 쿼리 탐지 (쿼리는 src/libs/supabase/queries/ 에서만 작성)

> 아래 결과는 후보 목록이다. `supabase.auth.getUser()`/`signInWithPassword()`처럼
> 세션만 확인하는 auth 호출은 규칙 위반이 아니므로 제외하고, `.from(테이블명)`으로
> 실제 테이블을 조회/변경하는 경우만 위반으로 판단한다.

!`grep -rln "createClient(\|createAdminClient(" --include="*.tsx" --include="*.ts" src/app/ 2>/dev/null`

### 4단계: 잘못된 shadcn utils 경로 탐지 (`@/lib/utils`는 오타, `@/libs/utils`가 정답)

!`grep -rn "@/lib/utils" --include="*.ts" --include="*.tsx" src/ 2>/dev/null`

### 5단계: 하드코딩 탐지

!`grep -rn "https\?://" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | grep -v ".env" | grep -v "supabase.co" | head -20`

### 6단계: 중복/미사용 쿼리 파일 탐지

!`for f in $(find src/libs/supabase/queries -name "*.ts"); do name=$(basename "$f"); grep -rlE "queries/${name%.ts}['\"]" src --include="*.ts" --include="*.tsx" | grep -v "$f" > /dev/null || echo "미사용 의심: $f"; done`

### 7단계: 감사 결과 출력

발견된 이슈를 우선순위별로 정리하여 보고한다.

```
=== GFix Audit 결과 ===
[npm 오염] N건
[인라인 쿼리] N건
[경로 오타] N건
[하드코딩] N건
[미사용 쿼리 파일] N건
총 이슈: N건
```

> TODO/FIXME 추적은 `/gfix-debt` 커맨드를 사용한다.
