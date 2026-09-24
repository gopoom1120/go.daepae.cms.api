---
name: cors_whitelist_vs_documented_convention
description: src/middleware.ts의 CORS 와일드카드→화이트리스트 전환 diff가 .claude/memory/cors-setup.md에 문서화된 기존 컨벤션과 불일치함 (2026-09-24 확인, APPROVED 조건부)
type: project
---

## 배경

2026-09-24, `src/middleware.ts`에서 `/api/v1/*` 공개 API의 CORS를
`Access-Control-Allow-Origin: "*"` 하드코딩 → `ALLOWED_ORIGINS` 배열 기반
화이트리스트(요청 Origin이 목록에 있으면 그 값을 echo, 없으면 헤더 생략)로
전환. `go-daepae.vercel.app`(랜딩페이지)과 `localhost:3000`만 등록.
실제 curl 테스트(4가지 시나리오)로 동작 확인됨. 리뷰 결과 APPROVED(조건부).

## 발견한 불일치: 코드 vs `.claude/memory/cors-setup.md`

이 저장소에는 CORS 설계를 문서화한 `.claude/memory/cors-setup.md`가 있고
`CLAUDE.md`가 이를 "동적 REST API용 CORS 설정"의 authoritative 참조로 명시한다.
그런데 이 문서가 규정하는 내용과 2026-09-24 diff의 실제 구현이 여러 지점에서 다르다:

1. **오리진 관리 방식**: 문서는 `CORS_ALLOWED_ORIGINS` 환경변수(콤마 구분)를
   단일 진실 공급원으로 규정("코드 변경 없이 환경변수만 수정"). 실제 구현은
   `ALLOWED_ORIGINS` 배열을 코드에 하드코딩 — 도메인 추가/제거 시 재배포 필요.
2. **`Vary: Origin` 헤더**: 문서는 "CDN/프록시가 Origin별로 캐시를 분리하도록
   Preflight + 실제 응답 모두에 첨부"를 필수 규칙으로 명시. 실제 구현에는
   `Vary: Origin`이 preflight/실제 응답 어디에도 없음.
3. **미허용 Origin의 OPTIONS 응답**: 문서는 "미허용 Origin → 403"을 명시.
   실제 구현은 204(성공) + 헤더만 생략하는 방식(사양상 브라우저는 여전히
   차단하므로 기능적으로는 동일하지만, 접근 로그에서 차단 여부 구분이 어려움).
4. **자료구조**: 문서는 `Set.has()` O(1) 조회를 권장. 실제 구현은 배열 `.includes()`.
5. **`Access-Control-Max-Age`**: 문서는 `NODE_ENV`별 분기(prod 86400 / dev 0)를
   권장. 실제 구현은 항상 86400 고정.

이전에는 CORS가 아예 와일드카드(`*`)였다는 사용자 설명과도 맞지 않아, 이
`cors-setup.md` 자체가 실제 구현된 적 없는 stale/aspirational 문서였을 가능성이 높다.

## Why

`Vary: Origin` 부재는 이론적으로 CDN/엣지 캐시가 Origin별 응답을 뒤섞어 캐싱할
위험이 있지만, 관련 라우트가 모두 `export const dynamic = "force-dynamic"`이고
명시적 `Cache-Control`이 없어 Vercel 기본 동작상 공유 캐싱 위험은 낮다고 판단해
Critical/blocking으로 잡지 않고 Major(비차단)로 분류, APPROVED(조건부) 처리함.
문서-코드 불일치 자체는 향후 다른 엔지니어(또는 에이전트)가 `cors-setup.md`를
신뢰하고 다른 구현을 하면 혼란이 생기므로 별도로 정리 필요.

## How to apply

- 이 저장소에서 CORS 관련 diff를 리뷰할 때마다 `.claude/memory/cors-setup.md`를
  다시 열어 실제 `src/middleware.ts` 구현과 대조할 것 — 두 문서가 여전히
  어긋나 있다면(즉 이 메모 작성 이후 누군가 정리하지 않았다면) 매번 다시 지적.
- `Vary: Origin` 추가는 비용이 거의 없는 best-practice이므로 리뷰 때마다
  누락되어 있으면 Major로 계속 권고할 것(단, force-dynamic + no Cache-Control
  조합이 유지되는 한 blocking까지는 아님 — 이 전제가 깨지면, 즉 어느 시점에
  `/api/v1/*`에 `Cache-Control`이 추가되거나 CDN 캐싱이 붙으면 즉시 Critical로 격상).
- 브라우저 기반 서드파티 파트너(랜딩페이지 외)가 추가로 필요해지면
  `ALLOWED_ORIGINS`(또는 최종적으로 env var화된 목록)에 도메인을 추가해야
  하며, 이는 코드 변경+재배포가 필요하다는 점을 사용자에게 상기시킬 것.
- X-API-Key로 인증하는 `/api/v1/[resource]` 라우트는 CORS 화이트리스트와
  무관하게 서버-투-서버(curl) 호출이 정상 동작함 — CORS는 브라우저 전용
  메커니즘이므로 화이트리스트 축소가 그 라우트의 "임의 서버가 API 키만 알면
  호출 가능" 설계와 충돌하지 않는다는 점을 반복 확인함.
