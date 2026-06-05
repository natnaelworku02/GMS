"use client";

import { useRouter } from "@/i18n/navigation";
import { useCreateRoleMutation } from "@/features/auth/api";
import { RoleForm } from "@/features/auth/roles/components/RoleForm";
import type { CreateRoleFormData } from "@/features/auth/roles/schemas";

export default function NewRolePage() {
  const router = useRouter();
  const [createRole, { isLoading }] = useCreateRoleMutation();

  const onSubmit = async (data: CreateRoleFormData) => {
    await createRole({ name: data.name, is_superadmin: data.is_superadmin }).unwrap();
    router.push("/roles");
  };

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.push("/roles")}
        className="mb-6 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Roles
      </button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New Role</h1>
      <div className="rounded-xl border bg-card p-6">
        <RoleForm onSubmit={onSubmit} isSubmitting={isLoading} />
      </div>
    </div>
  );
}
