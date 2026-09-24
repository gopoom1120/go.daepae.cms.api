"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";

export async function signInAction(
  email: string,
  password: string,
): Promise<{ error: string } | void> {
  if (!email || !password) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect("/users");
}
