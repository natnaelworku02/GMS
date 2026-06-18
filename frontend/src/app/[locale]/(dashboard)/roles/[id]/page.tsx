"use client";

import { use, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  useGetRoleQuery,
  useUpdatePermissionsMutation,
} from "@/features/auth/api";
import { PermissionMatrix } from "@/features/auth/roles/components/PermissionMatrix";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import type { PermissionSet } from "@/features/auth/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default function RoleDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const { data: role, isLoading } = useGetRoleQuery(id, { skip: isNew });
  const [updatePermissions, { isLoading: isSaving }] = useUpdatePermissionsMutation();

  const [permissions, setPermissions] = useState<PermissionSet[] | null>(null);

  const actualPermissions = permissions ?? role?.permissions ?? [];

  const handleSave = async () => {
    try {
      await updatePermissions({ id, permissions: actualPermissions }).unwrap();
      toast.success("Permissions saved");
    } catch {
      toast.error("Failed to save permissions");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!role && !isNew) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Role not found</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" onClick={() => router.push("/roles")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Roles
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {role?.name || "Role"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role?.is_superadmin ? "Super Admin — all permissions granted" : "Standard role"}
        </p>
      </div>

      {role?.is_superadmin ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Super Admin roles bypass all permission checks. No permission configuration needed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Permissions</h2>
            <PermissionMatrix
              permissions={actualPermissions}
              onChange={setPermissions}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save size={15} />
            Save Permissions
          </Button>
        </div>
      )}
    </div>
  );
}
