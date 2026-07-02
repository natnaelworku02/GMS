"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useGetToolQuery,
  useGetToolCheckoutsQuery,
  useReturnToolMutation,
} from "@/features/tools/api";
import { useGetEmployeesQuery } from "@/features/jobCards/api";
import { useGetJobCardsQuery } from "@/features/jobCards/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Loader2, Undo2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import type { ToolCheckout } from "@/features/tools/types";

export default function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("tools");
  const router = useRouter();
  const { data: tool, isLoading } = useGetToolQuery(id);
  const { data: checkouts = [] } = useGetToolCheckoutsQuery({ job_card_id: undefined });
  const { data: employees = [] } = useGetEmployeesQuery();
  const { data: jobCards = [] } = useGetJobCardsQuery();
  const [returnTool, { isLoading: isReturning }] = useReturnToolMutation();
  const [confirmReturn, setConfirmReturn] = useState<{ id: string; employeeName: string } | null>(null);

  const toolCheckouts = useMemo(
    () => checkouts.filter((c) => c.tool_id === id),
    [checkouts, id],
  );

  const employeeName = (employeeId: string) =>
    employees.find((e) => e.id === employeeId)?.name || employeeId;

  const jobCardTitle = (jobCardId: string) =>
    jobCards.find((j) => j.id === jobCardId)
      ? `#${jobCards.find((j) => j.id === jobCardId)!.id.slice(0, 8)}`
      : jobCardId;

  const handleReturn = async () => {
    if (!confirmReturn) return;
    try {
      await returnTool(confirmReturn.id).unwrap();
      setConfirmReturn(null);
    } catch {
      toast.error("Failed to return tool");
    }
  };

  const promptReturn = (checkoutId: string, empName: string) => {
    setConfirmReturn({ id: checkoutId, employeeName: empName });
  };

  const activeCheckouts = toolCheckouts.filter((c) => !c.checked_in_at);
  const historyCheckouts = toolCheckouts.filter((c) => c.checked_in_at);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => router.push("/tools")} className="mb-6">
          <ArrowLeft size={15} />
          Back to Tools
        </Button>
        <p className="text-sm text-destructive">Tool not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <Button variant="ghost" onClick={() => router.push("/tools")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Tools
      </Button>

      <div className="space-y-6">
        {/* Tool Details */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h1 className="text-xl font-semibold">{tool.name}</h1>
            {tool.specifications && (
              <p className="mt-1 text-sm text-muted-foreground">{tool.specifications}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("totalQuantity")}</p>
              <p className="text-lg font-semibold">{tool.total_quantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("availableQuantity")}</p>
              <p className={`text-lg font-semibold ${tool.available_quantity > 0 ? "" : "text-destructive"}`}>
                {tool.available_quantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Checked Out</p>
              <p className="text-lg font-semibold text-amber-500">
                {tool.total_quantity - tool.available_quantity}
              </p>
            </div>
          </div>
        </div>

        {/* Active Checkouts */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">
            Active Checkouts
            {activeCheckouts.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">
                {activeCheckouts.length}
              </Badge>
            )}
          </h2>
          {activeCheckouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active checkouts</p>
          ) : (
            <div className="divide-y divide-border">
              {activeCheckouts.map((co) => (
                <div key={co.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium">{employeeName(co.employee_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      Job {jobCardTitle(co.job_card_id)} — Qty: {co.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(co.checked_out_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => promptReturn(co.id, employeeName(co.employee_id))}
                    disabled={isReturning}
                  >
                    {isReturning ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Undo2 size={14} />
                    )}
                    {t("return")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout History */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">Checkout History</h2>
          {historyCheckouts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No checkout history</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {historyCheckouts.map((co) => (
                <div key={co.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{employeeName(co.employee_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(co.checked_out_at).toLocaleDateString()} → {new Date(co.checked_in_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Qty: {co.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmReturn}
        onOpenChange={(open) => { if (!open) setConfirmReturn(null); }}
        title={t("return")}
        description={`Return tool checked out by ${confirmReturn?.employeeName}?`}
        onConfirm={handleReturn}
      />
    </div>
  );
}
