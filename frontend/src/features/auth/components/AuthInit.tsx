"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setCredentials, setTokens, setLoading, logout } from "@/features/auth/authSlice";
import { useLazyGetMeQuery, useLazyGetRoleQuery, useRefreshTokenMutation } from "@/features/auth/api";
import { storage } from "@/lib/storage";

export function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAppSelector((s) => s.auth);
  const [getMe] = useLazyGetMeQuery();
  const [getRole] = useLazyGetRoleQuery();
  const [refreshToken] = useRefreshTokenMutation();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      const stored = await storage.getTokens();
      if (!stored) {
        dispatch(setLoading(false));
        return;
      }

      dispatch(setTokens(stored));

      try {
        const user = await getMe().unwrap();
        const role = await getRole(user.role_id).unwrap();

        const permissions: Record<string, boolean> = {};
        if (role.permissions) {
          role.permissions.forEach((p) => {
            permissions[`${p.module}.create`] = p.can_create;
            permissions[`${p.module}.read`] = p.can_read;
            permissions[`${p.module}.update`] = p.can_update;
            permissions[`${p.module}.delete`] = p.can_delete;
          });
        }

        dispatch(
          setCredentials({
            user: { ...user, role_name: role.name },
            accessToken: stored.accessToken,
            refreshToken: stored.refreshToken,
            permissions,
            isSuperAdmin: role.is_superadmin,
          }),
        );
      } catch {
        try {
          const refreshed = await refreshToken({ refresh_token: stored.refreshToken }).unwrap();
          await storage.setTokens(refreshed.access_token, refreshed.refresh_token);
          dispatch(setTokens({ accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token }));

          const user = await getMe().unwrap();
          const role = await getRole(user.role_id).unwrap();

          const permissions: Record<string, boolean> = {};
          if (role.permissions) {
            role.permissions.forEach((p) => {
              permissions[`${p.module}.create`] = p.can_create;
              permissions[`${p.module}.read`] = p.can_read;
              permissions[`${p.module}.update`] = p.can_update;
              permissions[`${p.module}.delete`] = p.can_delete;
            });
          }

          dispatch(
            setCredentials({
              user: { ...user, role_name: role.name },
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token,
              permissions,
              isSuperAdmin: role.is_superadmin,
            }),
          );
        } catch {
          await storage.clearTokens();
          dispatch(logout());
        }
      }
    }

    init();
  }, [dispatch, getMe, getRole, refreshToken]);

  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === "/login";
    if (!isAuthenticated && !isLoginPage) {
      router.replace("/login");
    }
    if (isAuthenticated && user && isLoginPage) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
