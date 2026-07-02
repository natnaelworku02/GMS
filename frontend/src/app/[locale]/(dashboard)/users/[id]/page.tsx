"use client";

import { use, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  useGetUserQuery,
  useUpdateUserMutation,
  useResetPasswordMutation,
} from "@/features/auth/api";
import { UserForm } from "@/features/auth/users/components/UserForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { CreateUserFormData } from "@/features/auth/users/schemas";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditUserPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: user, isLoading: loadingUser } = useGetUserQuery(id);
  const [updateUser, { isLoading: isSaving }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();
  const [newPassword, setNewPassword] = useState("");

  const onSubmit = async (data: CreateUserFormData) => {
    await updateUser({
      id,
      body: {
        full_name: data.full_name,
        role_id: data.role_id,
        is_active: data.is_active,
      },
    }).unwrap();
    router.push("/users");
  };

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error(t("passwordLengthError"));
      return;
    }
    await resetPassword({ id, password: newPassword }).unwrap();
    toast.success(t("passwordResetDone"));
    setNewPassword("");
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <div className="py-20 text-center text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <Button variant="ghost" onClick={() => router.push("/users")} className="mb-6">
        <ArrowLeft size={15} />
        {tc("back")} {t("title")}
      </Button>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("edit")}</h1>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <UserForm
          defaultValues={{
            full_name: user.full_name,
            phone: user.phone,
            role_id: user.role_id,
            is_active: user.is_active,
          }}
          onSubmit={onSubmit}
          isSubmitting={isSaving}
          mode="edit"
        />
      </div>

      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">{t("resetPassword")}</h2>
        <div className="flex items-center gap-3">
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            placeholder={t("newPassword")}
            className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={handleReset} disabled={isResetting} variant="outline">
            {isResetting ? t("resettingPassword") : t("resetPassword")}
          </Button>
        </div>
      </div>
    </div>
  );
}
