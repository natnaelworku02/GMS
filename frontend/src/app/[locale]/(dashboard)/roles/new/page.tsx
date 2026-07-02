"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCreateRoleMutation, useUpdatePermissionsMutation } from "@/features/auth/api";
import { PermissionMatrix } from "@/features/auth/roles/components/PermissionMatrix";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MODULES } from "@/lib/constants";
import type { PermissionSet } from "@/features/auth/types";

export default function NewRolePage() {
  const t = useTranslations("roles");
  const tc = useTranslations("common");
  const router = useRouter();
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updatePermissions, { isLoading: isSettingPerms }] = useUpdatePermissionsMutation();

  const [name, setName] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<PermissionSet[]>(
    MODULES.map((m) => ({
      module: m.key,
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
    })),
  );
  const [error, setError] = useState("");

  const isSubmitting = isCreating || isSettingPerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(tc("create") + " " + t("name"));
      return;
    }
    setError("");

    try {
      const role = await createRole({ name: name.trim(), is_superadmin: isSuperAdmin }).unwrap();
      if (!isSuperAdmin) {
        await updatePermissions({ id: role.id, permissions }).unwrap();
      }
      router.push("/roles");
    } catch {
      setError(tc("error"));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" onClick={() => router.push("/roles")} className="mb-6">
        <ArrowLeft size={15} />
        {tc("back")} {t("title")}
      </Button>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">{t("name")}</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_superadmin"
              type="checkbox"
              checked={isSuperAdmin}
              onChange={(e) => setIsSuperAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-input text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="is_superadmin" className="text-sm">
              {t("isSuperAdmin")} — bypasses all permission checks
            </label>
          </div>
        </div>

        {!isSuperAdmin && (
          <div>
            <h2 className="mb-3 text-sm font-semibold">{t("permissions")}</h2>
            <PermissionMatrix
              permissions={permissions}
              onChange={setPermissions}
            />
          </div>
        )}

        {isSuperAdmin && (
          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("isSuperAdmin")} roles have all permissions automatically.
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? t("creating") : t("create")}
        </Button>
      </form>
    </div>
  );
}
