import { createAdminClient } from "@/libs/supabase/admin";
import type { UserProfile } from "@/types/user";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidUUID(id: string): void {
  if (!id || !UUID_REGEX.test(id))
    throw new Error("유효하지 않은 유저 ID입니다.");
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("franchise_users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getAllUsers]", error);
    throw new Error(`유저 목록을 불러오지 못했습니다: ${error.message}`);
  }
  return data ?? [];
}

export async function deleteUser(id: string): Promise<void> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    console.error("[deleteUser]", error);
    throw new Error(`유저 삭제에 실패했습니다: ${error.message}`);
  }
}
