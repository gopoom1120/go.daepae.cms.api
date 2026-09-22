import { createClient } from '@/libs/supabase/client';

export async function signUpWithEmail(
  email: string,
  password: string,
  redirectTo: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  return { error: error?.message ?? null };
}
