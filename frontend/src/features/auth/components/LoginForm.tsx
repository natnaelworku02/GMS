"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useLoginMutation, useLazyGetMeQuery, useLazyGetRoleQuery } from "@/features/auth/api";
import { useAppDispatch } from "@/lib/hooks";
import { setCredentials, setTokens } from "@/features/auth/authSlice";
import { storage } from "@/lib/storage";
const loginSchema = (t: (key: string) => string) => z.object({
  phone: z.string().min(1, t("phoneRequired")).regex(/^\+?[0-9]+$/, t("invalidPhone")),
  password: z.string().min(1, t("passwordRequired")),
});

type LoginFormData = z.infer<ReturnType<typeof loginSchema>>;

export function LoginForm() {
  const t = useTranslations("auth");
  const dispatch = useAppDispatch();

  const [login, { isLoading }] = useLoginMutation();
  const [getMe] = useLazyGetMeQuery();
  const [getRole] = useLazyGetRoleQuery();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema(t)),
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
        <label htmlFor="phone" className="text-sm font-medium text-white/70">
          {t("phone")}
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder={t("phonePlaceholder")}
          className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 transition-all focus:border-indigo-500/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-red-400">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-white/70">
          {t("password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
          className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 transition-all focus:border-indigo-500/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:translate-y-[-1px] hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("signingIn")}
          </span>
        ) : (
          t("loginButton")
        )}
      </button>
    </form>
  );
}
