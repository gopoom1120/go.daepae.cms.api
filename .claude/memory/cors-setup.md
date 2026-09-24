# CORS 설정

## 구현 위치

| 역할                                               | 파일                |
| -------------------------------------------------- | ------------------- |
| Preflight(OPTIONS) 처리 + 실제 요청 CORS 헤더 주입 | `src/middleware.ts` |

> `next.config.mjs`의 `headers()`는 사용하지 않음. 정적 문자열만 지원해 다중 도메인 제어 불가. 모든 CORS 로직은 `middleware.ts` 단일 위치에서 관리.

## 허용 도메인 관리

`src/middleware.ts`의 `ALLOWED_ORIGINS` 배열(하드코딩)이 단일 진실 공급원.

```ts
const ALLOWED_ORIGINS = [
  "https://go-daepae.vercel.app",
  "http://localhost:3000",
];
```

도메인 추가/제거 시 이 배열을 직접 수정하고 재배포한다. Vercel 프리뷰 배포처럼 매번 해시가 바뀌는 주소를 허용해야 하면 그때마다 여기 추가한다.

## 핵심 구현 규칙

1. **OPTIONS는 API 경로만 처리**
   `isPublicApiPath()` 체크 없이 최상단에 두면 어드민 경로 Preflight도 허용하게 됨.
   비API 경로의 OPTIONS → `405`. 공개 API 경로인데 미허용 Origin → `Access-Control-Allow-Origin` 헤더를 생략한 채 `204`로 응답(브라우저가 자체적으로 읽기를 차단함 — curl/서버 간 호출은 CORS를 신경 쓰지 않으므로 정상 처리됨).

2. **`Authorization` 헤더 미허용**
   인증은 `X-API-Key`만 사용하므로 `Access-Control-Allow-Headers`에서 제외.
   허용 헤더: `Content-Type, X-API-Key, Accept`

3. **`Vary: Origin` 필수**
   CDN/프록시가 Origin별로 캐시를 분리하도록 Preflight + 실제 응답 모두에 첨부.

4. **`Access-Control-Max-Age`는 고정값(`86400`)**
   환경별 분기 없음 — 프리뷰/로컬 모두 동일하게 24시간 캐시.

5. **`Array.includes()` 조회**
   `ALLOWED_ORIGINS`가 소수(2~3개) 고정 목록이라 `Set` 없이 `includes()`로 충분.

## 동작 흐름

```
브라우저 → OPTIONS /api/v1/*
  → middleware: isPublicApiPath? YES
  → resolveCorsOrigin: 허용 목록에 있으면 origin 반환, 없으면 null
  → 204 + CORS 헤더 반환 (Origin 미허용 시 Access-Control-Allow-Origin 헤더만 생략)

브라우저 → GET /api/v1/*
  → middleware: CORS 헤더 주입 후 next()
  → route 핸들러: validateApiKey → 데이터 응답
```

## ADMIN_PATHS vs matcher 동기화 주의

`ADMIN_PATHS` 배열과 `config.matcher` 배열이 별도 관리됨.
새 어드민 경로 추가 시 **두 곳을 동시에 수정**해야 미들웨어가 실행되고 보호가 적용됨.
