import type { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/server";
import type { UserProfile } from "@/types/user";

export interface AuthenticatedUser {
  user: User;
  profile: UserProfile | null;
}

/** 현재 세션 사용자와 franchise_users 프로필을 함께 조회한다 (RLS: 본인 행만) */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("franchise_users")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: profile ?? null };
}
