"use client";

import { useLogoutSessionMutation } from "@/features/auth/api";
import { logout } from "@/features/auth/authSlice";
import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearQueryCache } from "@/lib/offline/cache";
import { clearMutations } from "@/lib/offline/queue";
import { clearPrivateBrowserData } from "@/lib/storage";

export function useEndSession() {
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const [logoutSession] = useLogoutSessionMutation();
  const dispatch = useAppDispatch();

  return async () => {
    if (refreshToken) {
      await logoutSession({ refresh_token: refreshToken }).unwrap().catch(() => undefined);
    }
    await Promise.all([clearPrivateBrowserData(), clearMutations(), clearQueryCache()]);
    dispatch(api.util.resetApiState());
    dispatch(logout());
  };
}
