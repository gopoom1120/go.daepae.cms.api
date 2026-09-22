import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 랜딩페이지(go_daepae)의 팝업/공지사항 노출 전용 공개 조회 엔드포인트.
// 기존 /api/v1/[resource]는 X-API-Key가 필요한데, 정적 사이트는 시크릿을 숨길 서버가
// 없으므로 이 계열은 별도로 무인증 공개 처리한다. franchise_popups_public 뷰가 이미
// 발행 여부(is_published)와 노출기간(start_date~end_date)을 필터링해준다.
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("franchise_popups_public")
    .select(
      "id,title,image_url,link_url,start_date,end_date,sort_order,created_at",
    )
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[GET /api/v1/public/franchise-popups]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
