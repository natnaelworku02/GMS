"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetRolesQuery } from "@/features/auth/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import type { Role } from "@/features/auth/types";

export default function RolesPage() {
  const t = useTranslations("roles");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: rolesResp, isLoading } = useGetRolesQuery({ page, page_size: 20, search: searchQuery || undefined });
  const roles = rolesResp?.items ?? [];
  const total = rolesResp?.total ?? 0;
  const totalPages = rolesResp?.total_pages ?? 0;

  const columns: Column<Role>[] = [
    {
      key: "name",
      header: t("name"),
      render: (r) => <span className="font-medium">{r.name}</span>,
      sortable: true,
    },
    {
      key: "is_superadmin",
      header: t("typeHeader"),
      render: (r) =>
        r.is_superadmin ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-500">
            {t("superAdmin")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {r.permissions.length} {r.permissions.length !== 1 ? "permissions" : "permission"}
          </span>
        ),
    },
    {
      key: "created_at",
      header: tc("createdAt"),
      render: (r) => (
        <span className="text-muted-foreground">
          {new Date(r.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Can permission="users.update">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              router.push(`/roles/${r.id}`);
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
        description={`${total} role${total !== 1 ? "s" : ""}`}
        action={
          <Can permission="users.create">
            <Button onClick={() => router.push("/roles/new")}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </Can>
        }
      />

      <div className="mt-6">
        <DataTable<Role>
          columns={columns}
          data={roles}
          isLoading={isLoading}
          emptyMessage={t("noRoles")}
          searchPlaceholder={t("search")}
          searchValue={searchQuery}
          onSearch={(v) => { setSearchQuery(v); setPage(1); }}
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
