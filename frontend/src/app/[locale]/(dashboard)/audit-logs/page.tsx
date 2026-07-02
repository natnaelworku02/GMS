"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useGetAuditLogsQuery } from "@/features/audit/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { AuditLog } from "@/features/audit/types";

export default function AuditLogsPage() {
  const t = useTranslations("audit");
  const tc = useTranslations("common");
  const [entityFilter, setEntityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs = [], isLoading } = useGetAuditLogsQuery(
    entityFilter ? { entity_type: entityFilter } : undefined,
  );

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.entity_type && l.entity_type.toLowerCase().includes(q)) ||
        (l.entity_id && l.entity_id.toLowerCase().includes(q)) ||
        (l.user_name && l.user_name.toLowerCase().includes(q)),
    );
  }, [logs, searchQuery]);

  const entityTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.entity_type).filter(Boolean));
    return Array.from(types).sort();
  }, [logs]);

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
          {l.details || "—"}
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
        description={t("count", { count: logs.length })}
      />

      <div className="mt-4 flex items-center gap-3">
        {entityTypes.length > 1 && (
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t("allTypes")}</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-4">
        <DataTable<AuditLog>
          columns={columns}
          data={filteredLogs}
          isLoading={isLoading}
          emptyMessage={t("noLogs")}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          searchPlaceholder={t("searchPlaceholder") || tc("search")}
        />
      </div>
    </div>
  );
}
