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
  const [searchQuery, setSearchQuery] = useState("");
  const { data: roles = [], isLoading } = useGetRolesQuery();

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        description={`${roles.length} role${roles.length !== 1 ? "s" : ""}`}
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
          data={filteredRoles}
          isLoading={isLoading}
          emptyMessage={t("noRoles")}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          searchPlaceholder={t("searchPlaceholder") || tc("search")}
        />
      </div>
    </div>
  );
}
