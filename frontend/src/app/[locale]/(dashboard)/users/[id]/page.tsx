"use client";

import { use } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  useGetUserQuery,
  useUpdateUserMutation,
  useResetPasswordMutation,
} from "@/features/auth/api";
import { UserForm } from "@/features/auth/users/components/UserForm";
import type { CreateUserFormData } from "@/features/auth/users/schemas";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditUserPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data: user, isLoading: loadingUser } = useGetUserQuery(id);
  const [updateUser, { isLoading: isSaving }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

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

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <div className="py-20 text-center text-sm text-muted-foreground">User not found</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.push("/users")}
        className="mb-6 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Users
      </button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit User</h1>

      <div className="rounded-xl border bg-card p-6">
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

      <div className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold">Reset Password</h2>
        <div className="flex items-center gap-3">
          <input
            id="new-password"
            type="password"
            placeholder="New password"
            className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={async () => {
              const input = document.getElementById("new-password") as HTMLInputElement;
              const password = input?.value;
              if (!password || password.length < 8) {
                toast.error("Password must be at least 8 characters");
                return;
              }
              await resetPassword({ id, password }).unwrap();
              toast.success("Password reset successfully");
              input.value = "";
            }}
            disabled={isResetting}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-all hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isResetting ? "Resetting..." : "Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}
