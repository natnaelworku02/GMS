"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetUsersQuery, useGetRolesQuery, useDeleteUserMutation } from "@/features/auth/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/lib/hooks";
import type { User } from "@/features/auth/types";

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const router = useRouter();
  const { isSuperAdmin } = useAppSelector((s) => s.auth);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: usersResp, isLoading } = useGetUsersQuery({ page, page_size: 20, search: search || undefined });
  const { data: rolesResp } = useGetRolesQuery({ page: 1, page_size: 100 });
  const users = usersResp?.items ?? [];
  const roles = rolesResp?.items ?? [];
  const total = usersResp?.total ?? 0;
  const totalPages = usersResp?.total_pages ?? 0;
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id).unwrap();
      toast.success("User deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete user";
      toast.error(msg);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "full_name",
      header: t("fullName"),
      render: (u) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 text-xs font-semibold text-indigo-500">
            {u.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </span>
          <span className="font-medium">{u.full_name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "phone",
      header: t("phone"),
      render: (u) => <span className="text-muted-foreground">{u.phone}</span>,
      sortable: true,
    },
    {
      key: "is_active",
      header: t("isActive"),
      render: (u) =>
        u.is_active ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[oklch(0.62_0.17_165)]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {t("isActive")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {t("isInactive")}
          </span>
        ),
    },
    {
      key: "role",
      header: t("role"),
      render: (u) => <span className="text-muted-foreground">{roleMap[u.role_id] || "—"}</span>,
    },
    {
      key: "created_at",
      header: tc("createdAt"),
      render: (u) => (
        <span className="text-muted-foreground">
          {new Date(u.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          {isSuperAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  router.push(`/users/${u.id}`);
                }}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setDeleteTarget(u);
                }}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
      className: "w-20 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${total} user${total !== 1 ? "s" : ""}`}
        action={
          <Can permission="users.create">
            <Button onClick={() => router.push("/users/new")}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </Can>
        }
      />

      <div className="mt-6">
        <DataTable<User>
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage={t("noUsers")}
          searchPlaceholder={t("fullName") + "..."}
          searchValue={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          serverTotal={total}
          serverPage={page}
          serverPageSize={20}
          onServerPageChange={setPage}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteTarget?.full_name}? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
