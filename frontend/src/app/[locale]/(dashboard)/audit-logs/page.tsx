"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useGetAuditLogsQuery } from "@/features/audit/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import type { AuditLog } from "@/features/audit/types";

export default function AuditLogsPage() {
  const t = useTranslations("audit");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logsResp, isLoading } = useGetAuditLogsQuery({
    page,
    page_size: 20,
    search: searchQuery || undefined,
    entity_type: entityFilter || undefined,
  });
  const logs = logsResp?.items ?? [];
  const total = logsResp?.total ?? 0;
  const totalPages = logsResp?.total_pages ?? 0;

  const columns: Column<AuditLog>[] = [
    {
      key: "action",
      header: t("action"),
      render: (l) => {
        const action = l.action;
        let cls = "border-gray-300 text-gray-600 bg-gray-50";
        if (action === "create") cls = "border-emerald-300 text-emerald-600 bg-emerald-50";
        else if (action === "update") cls = "border-amber-300 text-amber-600 bg-amber-50";
        else if (action === "delete") cls = "border-red-300 text-red-600 bg-red-50";
        return (
          <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium uppercase ${cls}`}>
            {action}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "entity_type",
      header: t("entityType"),
      render: (l) => (
        <span className="text-sm text-muted-foreground">{l.entity_type}</span>
      ),
    },
    {
      key: "entity_id",
      header: t("entityId"),
      render: (l) => (
        <span className="font-mono text-xs text-muted-foreground">{l.entity_id}</span>
      ),
    },
    {
      key: "user_name",
      header: t("user"),
      render: (l) => <span className="text-sm">{l.user_name}</span>,
    },
    {
      key: "details",
      header: t("details"),
      render: (l) => (
        <span className="max-w-[200px] truncate text-sm text-muted-foreground">
          {typeof l.details === "object" && l.details !== null ? JSON.stringify(l.details) : l.details || "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: t("createdAt"),
      render: (l) => (
        <span className="text-sm text-muted-foreground">
          {new Date(l.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={t("count", { count: total })}
      />

      <div className="mt-4 flex items-center gap-3">
        <input
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          placeholder={t("entityType") + "..."}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-4">
        <DataTable<AuditLog>
          columns={columns}
          data={logs}
          isLoading={isLoading}
          emptyMessage={t("noLogs")}
          searchValue={searchQuery}
          onSearch={(v) => { setSearchQuery(v); setPage(1); }}
          searchPlaceholder={t("searchPlaceholder") || tc("search")}
          serverTotal={total}
          serverPage={page}
          serverPageSize={20}
          onServerPageChange={setPage}
        />
      </div>
    </div>
  );
}
