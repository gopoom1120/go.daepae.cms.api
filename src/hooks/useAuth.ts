"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/user";

export const authQueryKey = ["auth", "me"] as const;

export interface AuthMeResponse {
  user: User | null;
  profile: UserProfile | null;
}

async function fetchMe(): Promise<AuthMeResponse> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return { user: null, profile: null };
  return res.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: authQueryKey,
    queryFn: fetchMe,
    staleTime: 60 * 1000,
  });

  const user = data?.user ?? null;
  const profile = data?.profile ?? null;
  const isAuthenticated = !isLoading && user !== null;
  const isAdmin = !isLoading && profile?.role === "admin";

  const signOut = () => {
    document.cookie = "mock-auth=; path=/; max-age=0; SameSite=Strict";
    queryClient.setQueryData(authQueryKey, { user: null, profile: null });
    queryClient.invalidateQueries({ queryKey: authQueryKey });
    router.push("/sign/in");
  };

  return {
    user,
    loading: isLoading,
    profile,
    isAuthenticated,
    isAdmin,
    signOut,
  };
}
