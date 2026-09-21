"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/features/layout/components/LocaleSwitcher";
import { ThemeToggle } from "@/features/layout/components/ThemeToggle";
import { LoginForm } from "@/features/auth/components/LoginForm";

export function LoginPage() {
  const t = useTranslations("auth");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080e1c] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(45,212,191,0.06),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.04),transparent_40%)]" />

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-xl shadow-indigo-500/30">
            <span className="text-2xl font-bold text-white">G</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("loginTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-white/40">{t("companyName")}</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl shadow-black/20">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
