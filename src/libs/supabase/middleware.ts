import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 미들웨어 전용 Supabase 클라이언트
 * 요청/응답 객체에서 쿠키를 읽고 써서 세션을 자동 갱신한다
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: object }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2],
            ),
          );
        },
      },
    },
  );

  // 세션 갱신 (토큰 자동 refresh)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 여부와 별개로 관리자 권한(role='admin')을 함께 확인한다.
  // franchise_users는 auth.users 가입 시 role='user'로 자동 생성되므로,
  // "로그인됨"과 "관리자 승인됨"은 구분해야 한다.
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("franchise_users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  return { supabaseResponse, user, role };
}
