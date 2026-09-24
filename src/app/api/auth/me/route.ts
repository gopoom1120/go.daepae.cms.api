import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/libs/supabase/queries/auth-me";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getAuthenticatedUser();

  if (!result) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  return NextResponse.json(result);
}
