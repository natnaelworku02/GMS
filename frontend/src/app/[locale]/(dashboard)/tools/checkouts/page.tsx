"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useGetToolCheckoutsQuery, useReturnToolMutation } from "@/features/tools/api";
import { useGetToolsQuery } from "@/features/tools/api";
import { useGetEmployeesQuery, useGetJobCardsQuery } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Undo2 } from "lucide-react";
import type { ToolCheckout } from "@/features/tools/types";

export default function CheckoutsPage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const [unreturnedOnly, setUnreturnedOnly] = useState(false);
  const [jobCardFilter, setJobCardFilter] = useState("");

  const { data: allCheckouts = [], isLoading } = useGetToolCheckoutsQuery({ unreturned_only: unreturnedOnly || undefined });
  const { data: tools = [] } = useGetToolsQuery();
  const { data: employees = [] } = useGetEmployeesQuery();
  const { data: jobCards = [] } = useGetJobCardsQuery();
  const [returnTool, { isLoading: isReturning }] = useReturnToolMutation();

  const toolName = (toolId: string) => tools.find((tool) => tool.id === toolId)?.name || toolId;

  const employeeName = (employeeId: string) =>
    employees.find((e) => e.id === employeeId)?.name || employeeId;

  const jobCardTitle = (jobCardId: string) => {
    const jc = jobCards.find((j) => j.id === jobCardId);
    return jc ? `#${jc.id.slice(0, 8)}` : jobCardId;
  };

  const filtered = useMemo(() => {
    if (!jobCardFilter) return allCheckouts;
    return allCheckouts.filter((co) => co.job_card_id === jobCardFilter);
  }, [allCheckouts, jobCardFilter]);

  const handleReturn = async (checkoutId: string) => {
    try {
      await returnTool(checkoutId).unwrap();
    } catch {
      // error handled by RTK
    }
  };

  const columns: Column<ToolCheckout>[] = [
    {
      key: "tool",
      header: t("name"),
      render: (co) => <span className="font-medium">{toolName(co.tool_id)}</span>,
      sortable: true,
    },
    {
      key: "employee",
      header: t("employee"),
      render: (co) => <span>{employeeName(co.employee_id)}</span>,
      sortable: true,
    },
    {
      key: "job_card",
      header: t("jobCard"),
      render: (co) => <span className="text-muted-foreground">{jobCardTitle(co.job_card_id)}</span>,
      hideOnMobile: true,
    },
    {
      key: "quantity",
      header: "Qty",
      render: (co) => <span>{co.quantity}</span>,
    },
    {
      key: "checked_out_at",
      header: t("checkedOutAt"),
      render: (co) => (
        <span className="text-muted-foreground text-xs">
          {new Date(co.checked_out_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: tc("status"),
      render: (co) =>
        co.checked_in_at ? (
          <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">{t("return")}d</Badge>
        ) : (
          <Badge variant="destructive">{t("checkout")}d</Badge>
        ),
      sortable: true,
    },
    {
      key: "returned_at",
      header: t("returnedAt"),
      render: (co) =>
        co.checked_in_at ? (
          <span className="text-muted-foreground text-xs">
            {new Date(co.checked_in_at).toLocaleDateString()}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleReturn(co.id);
            }}
            disabled={isReturning}
          >
            {isReturning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 size={14} />}
            {t("return")}
          </Button>
        ),
      className: "text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("checkouts")}
        description={`${allCheckouts.length} checkout${allCheckouts.length !== 1 ? "s" : ""}`}
      />

      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unreturnedOnly}
              onChange={(e) => setUnreturnedOnly(e.target.checked)}
              className="rounded border-input"
            />
            {t("unreturnedTools")}
          </label>
          {jobCards.length > 0 && (
            <select
              value={jobCardFilter}
              onChange={(e) => setJobCardFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("jobCard")}s</option>
              {jobCards.map((jc) => (
                <option key={jc.id} value={jc.id}>
                  #{jc.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>

        <DataTable<ToolCheckout>
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={t("noCheckouts")}
        />
      </div>
    </div>
  );
}
