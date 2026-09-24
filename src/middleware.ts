import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/libs/supabase/middleware";

const ADMIN_PATHS = [
  "/users",
  "/orders",
  "/quotes",
  "/blog",
  "/products",
  "/portfolio",
  "/profile",
  "/settings",
  "/franchise",
];

// 공개 API(/api/v1/*)를 호출하는 걸 허용할 프론트엔드 출처.
// go.daepae(랜딩페이지) 배포/로컬 개발 주소만 등록한다 — Vercel 프리뷰 배포처럼
// 매 배포마다 해시가 바뀌는 주소가 필요하면 그때마다 여기 추가할 것.
const ALLOWED_ORIGINS = [
  "https://go-daepae.vercel.app",
  "http://localhost:3000",
];

function isPublicApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/v1/") || pathname === "/api/openapi.json";
}

function resolveCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS Preflight — 공개 API 경로에 한해서만 처리
  if (request.method === "OPTIONS") {
    if (!isPublicApiPath(pathname))
      return new NextResponse(null, { status: 405 });

    const corsOrigin = resolveCorsOrigin(request);
    const headers: Record<string, string> = {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Accept",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    if (corsOrigin) headers["Access-Control-Allow-Origin"] = corsOrigin;

    return new NextResponse(null, { status: 204, headers });
  }

  // 공개 API 경로는 세션 검증 없이 CORS 헤더만 주입 — X-API-Key 인증이 보안 레이어.
  // Origin이 화이트리스트에 없으면 헤더를 아예 생략한다(브라우저가 자체적으로 읽기를
  // 차단함 — curl/서버 간 호출은 CORS 자체를 신경 쓰지 않으므로 요청은 정상 처리됨).
  if (isPublicApiPath(pathname)) {
    const response = NextResponse.next();
    const corsOrigin = resolveCorsOrigin(request);
    if (corsOrigin)
      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-API-Key, Accept",
    );
    response.headers.set("Vary", "Origin");
    return response;
  }

  const { supabaseResponse, user, role } = await updateSession(request);
  const isAuthenticated = user !== null;
  const isAdmin = role === "admin";

  // /api/auth/me — 인증된 사용자만 접근 가능 (role 승인 대기 상태도 본인 정보는 조회 가능해야 함)
  if (pathname === "/api/auth/me" && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 루트 접속 → 관리자 승인 여부에 따라 분기 (isAuthenticated 기준이면 미승인 계정이 /users로
  // 갔다가 다시 /sign/in으로 튕기는 무한 리다이렉트가 발생함)
  if (pathname === "/") {
    const target = isAdmin ? "/users" : "/sign/in";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 이미 관리자로 로그인된 상태에서 /sign/in 접속 → /users로 이동
  if (pathname === "/sign/in" && isAdmin) {
    return NextResponse.redirect(new URL("/users", request.url));
  }

  // API 문서 페이지 — 로그인된 사용자만 접근 가능
  if (pathname === "/api-docs" || pathname.startsWith("/api-docs/")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/sign/in", request.url));
    }
    return supabaseResponse;
  }

  // 어드민 경로 — role='admin'이 아니면 차단 (미승인 계정의 셀프 가입 후 CMS 접근 방지)
  const isAdminPath = ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isAdminPath && !isAdmin) {
    return NextResponse.redirect(new URL("/sign/in", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/sign/in",
    "/api/auth/me",
    "/api/v1/:path*",
    "/api/openapi.json",
    "/api-docs/:path*",
    "/users/:path*",
    "/orders/:path*",
    "/quotes/:path*",
    "/blog/:path*",
    "/products/:path*",
    "/portfolio/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/franchise/:path*",
  ],
};
