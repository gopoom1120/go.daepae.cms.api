"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "@/types/user";
import { authQueryKey, useAuth, type AuthMeResponse } from "@/hooks/useAuth";

export function useUser() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const setProfile = (
    updater:
      UserProfile | null | ((prev: UserProfile | null) => UserProfile | null),
  ) => {
    queryClient.setQueryData(
      authQueryKey,
      (prev: AuthMeResponse | undefined) => {
        const nextProfile =
          typeof updater === "function"
            ? updater(prev?.profile ?? null)
            : updater;
        return { user: prev?.user ?? null, profile: nextProfile };
      },
    );
  };

  return { profile, setProfile };
}
