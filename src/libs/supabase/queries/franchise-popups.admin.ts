import { createAdminClient } from "@/libs/supabase/admin";
import type {
  FranchisePopup,
  FranchisePopupFormInput,
} from "@/types/franchise-popup";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidUUID(id: string): void {
  if (!id || !UUID_REGEX.test(id))
    throw new Error("유효하지 않은 팝업 ID입니다.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFranchisePopup(row: any): FranchisePopup {
  return {
    id: row.id,
    title: row.title,
    image_url: row.image_url ?? null,
    link_url: row.link_url ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    is_published: row.is_published ?? false,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toFranchisePopupPayload(input: FranchisePopupFormInput) {
  return {
    title: input.title,
    image_url: input.image_url || null,
    link_url: input.link_url || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    is_published: input.is_published,
  };
}

const TABLE = "franchise_popups";

export async function getAllFranchisePopups(): Promise<FranchisePopup[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getAllFranchisePopups]", error);
    throw new Error("팝업 목록을 불러오지 못했습니다.");
  }
  return (data ?? []).map(toFranchisePopup);
}

export async function getFranchisePopupByIdAdmin(
  id: string,
): Promise<FranchisePopup | null> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getFranchisePopupByIdAdmin]", error);
    throw new Error("팝업 정보를 불러오지 못했습니다.");
  }
  return toFranchisePopup(data);
}

export async function createFranchisePopup(
  input: FranchisePopupFormInput,
): Promise<FranchisePopup> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(toFranchisePopupPayload(input))
    .select()
    .single();
  if (error) {
    console.error("[createFranchisePopup]", error);
    throw new Error("팝업 저장에 실패했습니다.");
  }
  return toFranchisePopup(data);
}

export async function updateFranchisePopup(
  id: string,
  input: FranchisePopupFormInput,
): Promise<FranchisePopup> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(toFranchisePopupPayload(input))
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[updateFranchisePopup]", error);
    throw new Error("팝업 수정에 실패했습니다.");
  }
  return toFranchisePopup(data);
}

export async function deleteFranchisePopup(id: string): Promise<void> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteFranchisePopup]", error);
    throw new Error("팝업 삭제에 실패했습니다.");
  }
}

export async function updateFranchisePopupsSortOrder(
  updates: { id: string; sort_order: number }[],
): Promise<void> {
  const supabase = createAdminClient();
  const results = await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from(TABLE).update({ sort_order }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[updateFranchisePopupsSortOrder]", failed.error);
    throw new Error("순서 저장에 실패했습니다.");
  }
}
