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
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  const [showPwd, setShowPwd] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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

  const handleReset = () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error(t("passwordLengthError"));
      return;
    }
    setConfirmReset(true);
  };

  const confirmResetPassword = async () => {
    await resetPassword({ id, password: newPassword }).unwrap();
    toast.success(t("passwordResetDone"));
    setNewPassword("");
    setConfirmReset(false);
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
          <div className="relative flex-1">
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type={showPwd ? "text" : "password"}
              placeholder={t("newPassword")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button onClick={handleReset} disabled={isResetting} variant="outline">
            {isResetting ? t("resettingPassword") : t("resetPassword")}
          </Button>
        </div>
        {newPassword && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div
              className={`h-1.5 flex-1 rounded-full ${
                newPassword.length < 8 ? "bg-red-300" : newPassword.length < 12 ? "bg-amber-300" : "bg-emerald-300"
              }`}
            />
            <span
              className={
                newPassword.length < 8 ? "text-red-500" : newPassword.length < 12 ? "text-amber-500" : "text-emerald-500"
              }
            >
              {newPassword.length < 8 ? "Weak" : newPassword.length < 12 ? "Good" : "Strong"}
            </span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t("resetPassword")}
        description={`Reset password for ${user.full_name}? This action cannot be undone.`}
        confirmLabel={tc("confirm")}
        cancelLabel={tc("cancel")}
        onConfirm={confirmResetPassword}
      />
    </div>
  );
}
