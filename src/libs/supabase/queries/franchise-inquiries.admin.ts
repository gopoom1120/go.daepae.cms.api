import { createAdminClient } from "@/libs/supabase/admin";
import type {
  FranchiseInquiry,
  InquiryStatus,
} from "@/types/franchise-inquiry";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidUUID(id: string): void {
  if (!id || !UUID_REGEX.test(id))
    throw new Error("유효하지 않은 문의 ID입니다.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFranchiseInquiry(row: any): FranchiseInquiry {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    inquiry_type: row.inquiry_type,
    message: row.message ?? null,
    status: row.status,
    admin_memo: row.admin_memo ?? null,
    ip_address: row.ip_address ?? null,
    user_agent: row.user_agent ?? null,
    referer: row.referer ?? null,
    region: row.region ?? null,
    franchise_type: row.franchise_type ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const TABLE = "franchise_inquiries";

export async function getAllInquiries(): Promise<FranchiseInquiry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getAllInquiries]", error);
    throw new Error("문의 목록을 불러오지 못했습니다.");
  }
  return (data ?? []).map(toFranchiseInquiry);
}

export async function getInquiryByIdAdmin(
  id: string,
): Promise<FranchiseInquiry | null> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getInquiryByIdAdmin]", error);
    throw new Error("문의 정보를 불러오지 못했습니다.");
  }
  return toFranchiseInquiry(data);
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  adminMemo?: string,
): Promise<FranchiseInquiry> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const payload: { status: InquiryStatus; admin_memo?: string } = { status };
  if (adminMemo !== undefined) payload.admin_memo = adminMemo;
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[updateInquiryStatus]", error);
    throw new Error("문의 상태 변경에 실패했습니다.");
  }
  return toFranchiseInquiry(data);
}

export async function deleteInquiry(id: string): Promise<void> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteInquiry]", error);
    throw new Error("문의 삭제에 실패했습니다.");
  }
}
