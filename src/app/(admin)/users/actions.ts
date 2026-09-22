"use server";

import { deleteUser } from "@/libs/supabase/queries/users.admin";

export async function deleteUserAction(id: string): Promise<void> {
  return deleteUser(id);
}
