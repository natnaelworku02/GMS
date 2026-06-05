"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/features/layout/components/LocaleSwitcher";
import { ThemeToggle } from "@/features/layout/components/ThemeToggle";
import { LoginForm } from "@/features/auth/components/LoginForm";

export function LoginPage() {
  const t = useTranslations("auth");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground">
            <span className="text-xl font-bold text-background">G</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("loginTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fyamet Automotive</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
