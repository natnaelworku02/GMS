"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAppSelector } from "@/lib/hooks";
import { useGetMeQuery, useUpdateUserMutation, useResetPasswordMutation } from "@/features/auth/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock, Calendar, ShieldCheck, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const TABS = ["details", "password"] as const;

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: me, isLoading } = useGetMeQuery();
  const [update, { isLoading: updating }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const user:
    | ((typeof authUser) & { created_at?: string })
    | null = me
    ? { ...me, role_name: authUser?.role_name }
    : authUser;

  const [tab, setTab] = useState<"details" | "password">("details");

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user?.id || !fullName.trim()) return;
    try {
      await update({ id: user.id, body: { full_name: fullName.trim() } }).unwrap();
      toast.success(t("profileUpdated"));
    } catch {
      toast.error(tc("error"));
    }
  };

  const handleChangePassword = async () => {
    if (!user?.id) return;
    if (newPassword.length < 8) {
      toast.error(t("passwordLengthError"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordsDontMatch"));
      return;
    }
    try {
      await resetPassword({ id: user.id, password: newPassword }).unwrap();
      toast.success(t("passwordUpdated"));
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error(tc("error"));
    }
  };

  if (isLoading || !user) {
    return (
      <div className="mx-auto mt-20 max-w-lg text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </div>

      {/* Premium Tabs */}
      <div className="mb-8 flex gap-1 rounded-xl bg-muted/60 p-1 ring-1 ring-border/50">
        {TABS.map((tKey) => (
          <button
            key={tKey}
            onClick={() => setTab(tKey)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === tKey
                ? "bg-white text-indigo-600 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tKey === "details" ? <User size={15} /> : <Lock size={15} />}
            {tKey === "details" ? t("detailsTab") : t("passwordTab")}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "details" && (
        <div className="rounded-xl border bg-card shadow-sm">
          {/* Avatar / Identity Strip */}
          <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent px-6 pb-6 pt-8">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/5" />
            <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-teal-500/5" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/20">
                {user.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{user.full_name}</h2>
                <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck size={13} className="text-indigo-500" />
                  <span>{user.role_name || "User"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-5 p-6">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("personalInfo")}
              </h3>
              <div className="h-px bg-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-name">{t("fullName")}</Label>
              <Input id="pf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-phone">{t("phone")}</Label>
              <Input id="pf-phone" value={phone} disabled className="bg-muted/50 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Phone number cannot be changed.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t("role")}</p>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <ShieldCheck size={14} className="text-indigo-500" />
                  {user.role_name || "User"}
                </div>
              </div>
              {memberSince && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Member Since</p>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <Calendar size={14} className="text-teal-500" />
                    {memberSince}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t pt-5">
              <Button onClick={handleUpdateProfile} disabled={updating || !fullName.trim()}>
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save size={15} />
                {t("saveChanges")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === "password" && (
        <div className="rounded-xl border bg-card shadow-sm">
          {/* Header Strip */}
          <div className="rounded-t-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-6 pb-4 pt-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
                <Lock size={18} />
              </span>
              <div>
                <h2 className="text-base font-semibold">{t("changePassword")}</h2>
                <p className="text-sm text-muted-foreground">Choose a strong password you haven&apos;t used before.</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleChangePassword();
            }}
            className="space-y-5 p-6"
          >
            <div className="space-y-2">
              <Label htmlFor="pf-new-pwd">{t("newPassword")}</Label>
              <div className="relative">
                <Input
                  id="pf-new-pwd"
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-confirm-pwd">{t("confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="pf-confirm-pwd"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password strength hint */}
            {newPassword && (
              <div className="flex items-center gap-2 text-xs">
                <div
                  className={`h-1.5 flex-1 rounded-full ${
                    newPassword.length < 8
                      ? "bg-red-300"
                      : newPassword.length < 12
                        ? "bg-amber-300"
                        : "bg-emerald-300"
                  }`}
                />
                <span
                  className={
                    newPassword.length < 8
                      ? "text-red-500"
                      : newPassword.length < 12
                        ? "text-amber-500"
                        : "text-emerald-500"
                  }
                >
                  {newPassword.length < 8 ? "Weak" : newPassword.length < 12 ? "Good" : "Strong"}
                </span>
              </div>
            )}

            <div className="flex justify-end border-t pt-5">
              <Button type="submit" disabled={resetting || !newPassword || !confirmPassword}>
                {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("updatePassword")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
