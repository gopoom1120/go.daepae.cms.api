import { NextRequest, NextResponse } from "next/server";
import {
  hasRecentDuplicateInquiry,
  insertPublicInquiry,
} from "@/libs/supabase/queries/franchise-inquiries.public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRANCHISE_TYPES = [
  "신규 창업",
  "기존 매장 전환",
  "다점포 확장",
  "상담 후 결정",
] as const;

const PHONE_REGEX = /^[0-9-]{9,14}$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// 랜딩페이지(go_daepae)의 가맹문의 폼(인라인폼/Bottom Sheet/스티키바) 3곳이 호출하는
// 공개 제출 엔드포인트. 정적 사이트에서 직접 호출하므로 X-API-Key 인증 없음 —
// franchise_inquiries 테이블은 RLS로 anon insert만 허용하도록 이미 설계돼 있다.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, phone, franchiseType, region, website } = body as Record<string, unknown>;

  // 허니팟: 사람 눈에는 안 보이는 필드가 채워져 있으면 봇으로 간주하고 조용히 성공 처리
  if (isNonEmptyString(website)) {
    return NextResponse.json({ ok: true });
  }

  if (!isNonEmptyString(name) || name.trim().length > 50) {
    return NextResponse.json({ error: "이름을 확인해주세요." }, { status: 400 });
  }
  if (!isNonEmptyString(phone) || !PHONE_REGEX.test(phone.trim())) {
    return NextResponse.json({ error: "연락처를 확인해주세요." }, { status: 400 });
  }
  if (
    !isNonEmptyString(franchiseType) ||
    !FRANCHISE_TYPES.includes(franchiseType as (typeof FRANCHISE_TYPES)[number])
  ) {
    return NextResponse.json({ error: "창업유형을 선택해주세요." }, { status: 400 });
  }
  if (region !== undefined && region !== null && typeof region !== "string") {
    return NextResponse.json({ error: "희망지역을 확인해주세요." }, { status: 400 });
  }

  const trimmedPhone = phone.trim();

  try {
    if (await hasRecentDuplicateInquiry(trimmedPhone)) {
      return NextResponse.json(
        { error: "이미 접수된 문의입니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent");
    const referer = request.headers.get("referer");

    await insertPublicInquiry(
      {
        name: name.trim(),
        phone: trimmedPhone,
        franchiseType,
        region: isNonEmptyString(region) ? region.trim() : null,
      },
      { ipAddress, userAgent, referer },
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
