"use server";

import { createClient } from "@/libs/supabase/server";
import { toggleApiConfig } from "@/libs/supabase/queries/content-api-configs";

export async function toggleApiConfigAction(
  id: string,
  isEnabled: boolean,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await toggleApiConfig(id, isEnabled);
}
