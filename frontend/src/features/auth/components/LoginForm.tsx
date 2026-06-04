"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useLoginMutation, useLazyGetMeQuery, useLazyGetRoleQuery } from "@/features/auth/api";
import { useAppDispatch } from "@/lib/hooks";
import { setCredentials, setTokens } from "@/features/auth/authSlice";
import { storage } from "@/lib/storage";

const loginSchema = z.object({
  phone: z.string().min(1, "Phone is required").regex(/^\+?[0-9]+$/, "Invalid phone number"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const dispatch = useAppDispatch();

  const [login, { isLoading }] = useLoginMutation();
  const [getMe] = useLazyGetMeQuery();
  const [getRole] = useLazyGetRoleQuery();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      try {
        const tokens = await login(data).unwrap();

        dispatch(setTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }));

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
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            permissions,
            isSuperAdmin: role.is_superadmin,
          }),
        );

        await storage.setTokens(tokens.access_token, tokens.refresh_token);
      } catch {
        toast.error(t("invalidCredentials"), { position: "top-center" });
      }
    },
    [login, getMe, getRole, dispatch, t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium text-foreground/80">
          {t("phone")}
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+251912345678"
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground/80">
          {t("password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="relative inline-flex h-11 w-full items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {tCommon("loading")}
          </span>
        ) : (
          t("loginButton")
        )}
      </button>
    </form>
  );
}
