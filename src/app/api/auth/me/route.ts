import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("franchise_users")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ user, profile });
}
