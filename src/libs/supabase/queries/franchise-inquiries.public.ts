import { createAdminClient } from "@/libs/supabase/admin";

export interface PublicInquiryInput {
  name: string;
  phone: string;
  franchiseType: string;
  region: string | null;
}

export interface PublicInquiryMeta {
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
}

const DUPLICATE_WINDOW_MS = 60_000;

/** 같은 연락처로 최근 60초 이내 접수된 문의가 있으면 true (단순 스팸 방지) */
export async function hasRecentDuplicateInquiry(phone: string): Promise<boolean> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("franchise_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if (error) {
    console.error("[hasRecentDuplicateInquiry]", error);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function insertPublicInquiry(
  input: PublicInquiryInput,
  meta: PublicInquiryMeta,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("franchise_inquiries").insert({
    name: input.name,
    phone: input.phone,
    inquiry_type: "창업상담",
    franchise_type: input.franchiseType,
    region: input.region,
    message: null,
    ip_address: meta.ipAddress,
    user_agent: meta.userAgent,
    referer: meta.referer,
  });
  if (error) {
    console.error("[insertPublicInquiry]", error);
    throw new Error("문의 접수에 실패했습니다.");
  }
}
