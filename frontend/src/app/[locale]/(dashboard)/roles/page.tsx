"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetRolesQuery } from "@/features/auth/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/features/auth/components/Can";
import type { Role } from "@/features/auth/types";

export default function RolesPage() {
  const t = useTranslations("roles");
  const router = useRouter();
  const { data: roles = [], isLoading } = useGetRolesQuery();

  const columns: Column<Role>[] = [
    {
      key: "name",
      header: t("name"),
      render: (r) => <span className="font-medium">{r.name}</span>,
      sortable: true,
    },
    {
      key: "is_superadmin",
      header: "Type",
      render: (r) =>
        r.is_superadmin ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-[oklch(0.85_0.1_85)/0.2] px-2 py-0.5 text-xs font-medium text-[oklch(0.55_0.15_85)]">
            ⭐ Super Admin
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {r.permissions.length} permission{r.permissions.length !== 1 ? "s" : ""}
          </span>
        ),
    },
    {
      key: "created_at",
      header: "Created",
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/roles/${r.id}`);
            }}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Edit
          </button>
        </Can>
      ),
      className: "w-16 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("title")}
        description={`${roles.length} role${roles.length !== 1 ? "s" : ""}`}
        action={
          <Can permission="users.create">
            <button
              onClick={() => router.push("/roles/new")}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-all hover:opacity-90"
            >
              {t("create")}
            </button>
          </Can>
        }
      />

      <div className="mt-6">
        <DataTable<Role>
          columns={columns}
          data={roles}
          isLoading={isLoading}
          emptyMessage="No roles found"
        />
      </div>
    </div>
  );
}
