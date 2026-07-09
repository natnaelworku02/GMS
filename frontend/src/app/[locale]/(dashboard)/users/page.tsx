"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetUsersQuery, useGetRolesQuery } from "@/features/auth/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import type { User } from "@/features/auth/types";

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: usersResp, isLoading } = useGetUsersQuery({ page, page_size: 20, search: search || undefined });
  const { data: rolesResp } = useGetRolesQuery({ page: 1, page_size: 100 });
  const users = usersResp?.items ?? [];
  const roles = rolesResp?.items ?? [];
  const total = usersResp?.total ?? 0;
  const totalPages = usersResp?.total_pages ?? 0;
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));

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
        <Can permission="users.update">
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
        </Can>
      ),
      className: "w-12 text-right",
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
        />
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {tc("previous")}
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {tc("next")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
