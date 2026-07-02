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
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading } = useGetUsersQuery();
  const { data: roles = [] } = useGetRolesQuery();
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));

  const filtered = search
    ? users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          u.phone.includes(search),
      )
    : users;

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
        description={`${users.length} user${users.length !== 1 ? "s" : ""}`}
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
          data={filtered}
          isLoading={isLoading}
          emptyMessage={t("noUsers")}
          searchPlaceholder={t("fullName") + "..."}
          searchValue={search}
          onSearch={setSearch}
        />
      </div>
    </div>
  );
}
