"use client";

import { useState, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetJobCardQuery, useUpdateJobCardStatusMutation, useGetOwnerQuery, useGetVehicleQuery, useGetEmployeesQuery } from "@/features/jobCards/api";
import { useGetToolCheckoutsQuery } from "@/features/tools/api";
import { useGetPerformasQuery } from "@/features/performas/api";
import { PerformaStatusBadge } from "@/features/performas/components/PerformaStatusBadge";
import { useGetUsersQuery } from "@/features/auth/api";
import { StatusTimeline } from "@/features/jobCards/components/StatusTimeline";
import { ConditionWizard } from "@/features/jobCards/components/ConditionWizard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ArrowLeft, Pencil, Loader2, Clock, User, Wrench, Receipt, Plus } from "lucide-react";
import { JOB_STATUS_LABELS, JOB_STATUS_TRANSITIONS } from "@/lib/constants";
import type { VehicleConditionInput } from "@/features/jobCards/types";

export default function JobCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("jobCards");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: jobCard, isLoading } = useGetJobCardQuery(id);
  const { data: users = [] } = useGetUsersQuery();
  const { data: owner } = useGetOwnerQuery(jobCard?.owner_id || "", { skip: !jobCard?.owner_id });
  const { data: vehicle } = useGetVehicleQuery(jobCard?.vehicle_id || "", { skip: !jobCard?.vehicle_id });
  const { data: employees = [] } = useGetEmployeesQuery({ active_only: "true" });
  const { data: unreturnedCheckouts = [] } = useGetToolCheckoutsQuery(
    { job_card_id: id, unreturned_only: true },
  );
  const { data: linkedPerformas = [] } = useGetPerformasQuery(
    { job_card_id: id },
  );
  const [updateStatus, { isLoading: isTransitioning }] = useUpdateJobCardStatusMutation();
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openConfirm = (status: string) => {
    setConfirmStatus(status);
    setDialogOpen(true);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!jobCard) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <p className="text-sm text-muted-foreground">{t("notFound")}</p>
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
    </div>
  );

  const validTransitions = JOB_STATUS_TRANSITIONS[jobCard.status] || [];
  const canComplete = jobCard.status === "ready_for_testing" && unreturnedCheckouts.length === 0;
  const blockedByTools = jobCard.status === "ready_for_testing" && unreturnedCheckouts.length > 0;
  const conditionsInput: VehicleConditionInput[] = jobCard.conditions.map((c) => ({
    part_name: c.part_name,
    condition_state: c.condition_state,
  }));
  const creator = users.find((u) => u.id === jobCard.created_by);

  const handleStatusChange = async () => {
    if (!confirmStatus) return;
    try {
      await updateStatus({ id, status: confirmStatus }).unwrap();
    } catch {
      // handled by RTK
    }
    setDialogOpen(false);
    setConfirmStatus(null);
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/job-cards")}>
          <ArrowLeft size={15} />
          {t("backToList")}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/job-cards/${id}/edit`)}>
            <Pencil size={14} />
            {tc("edit")}
          </Button>
          {validTransitions.length > 0 && (
            <div className="flex gap-2">
              {validTransitions.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  size="sm"
                  onClick={() => openConfirm(nextStatus)}
                  disabled={isTransitioning || (nextStatus === "completed" && !canComplete)}
                  title={blockedByTools ? t("returnToolsFirst") : ""}
                >
                  {isTransitioning && <Loader2 className="h-4 w-4 animate-spin" />}
                  {JOB_STATUS_LABELS[nextStatus]}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {vehicle?.model || "Vehicle"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {vehicle?.plate_number}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={jobCard.status} />
            <span className="text-sm font-medium">
              {jobCard.mileage_km.toLocaleString()} km
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User size={12} />
            {t("createdBy", { name: creator?.full_name || jobCard.created_by })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {new Date(jobCard.created_at).toLocaleDateString()}
          </span>
          {jobCard.updated_at !== jobCard.created_at && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {t("updated")} {new Date(jobCard.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <StatusTimeline currentStatus={jobCard.status} />
      </div>

      {/* Info grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("owner")}</h2>
          <p className="text-sm">{owner?.name || tc("loading")}</p>
          <p className="text-xs text-muted-foreground">{owner?.phone}</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("vehicle")}</h2>
          <p className="text-sm">{vehicle?.model}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{t("plateNumber")}: {vehicle?.plate_number}</span>
            <span className="font-mono">{t("engineNumber")}: {vehicle?.engine_number}</span>
            <span className="font-mono">{t("chassisNumber")}: {vehicle?.chassis_number}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("details")}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("mileage")}</span>
              <span className="font-medium">{jobCard.mileage_km.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("status")}</span>
              <StatusBadge status={jobCard.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("privatePaint")}</span>
              <span>{jobCard.private_paint ? tc("yes") : tc("no")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("privateMechanic")}</span>
              <span>{jobCard.private_mechanic ? tc("yes") : tc("no")}</span>
            </div>
            {jobCard.insurance_provider && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("insuranceProvider")}</span>
                <span>{jobCard.insurance_provider}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("mechanics")}</h2>
          {jobCard.mechanics.length > 0 ? (
            <div className="space-y-2">
              {jobCard.mechanics.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.job_title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.phone}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noMechanics")}</p>
          )}
        </div>
      </div>

      {/* Tool Checkouts */}
      {(jobCard.status === "ready_for_testing" || jobCard.status === "completed") && (
        <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Wrench size={14} />
            {t("toolCheckouts")}
          </h2>
          {blockedByTools && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {t("returnToolsFirst")} ({unreturnedCheckouts.length} {t("unreturnedTools")})
            </div>
          )}
          {unreturnedCheckouts.length === 0 && jobCard.status === "completed" && (
            <p className="text-sm text-muted-foreground">{t("allToolsReturned")}</p>
          )}
          {unreturnedCheckouts.length === 0 && jobCard.status === "ready_for_testing" && (
            <p className="text-sm text-emerald-600">{t("allToolsReturned")}</p>
          )}
        </div>
      )}

      {/* Performas */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Receipt size={14} />
            {t("performas")}
          </h2>
          <Button size="sm" variant="outline" onClick={() => router.push(`/performas/new?job_card_id=${id}`)}>
            <Plus size={14} />
            {tc("create")}
          </Button>
        </div>
        {linkedPerformas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPerformas")}</p>
        ) : (
          <div className="space-y-2">
            {linkedPerformas.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/performas/${p.id}`)}
              >
        <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">v{p.version}</span>
                  <PerformaStatusBadge status={p.status} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(p.grand_total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">{t("description")}</h2>
        <p className="text-sm">{jobCard.description}</p>
        {jobCard.remarks && (
          <>
            <h3 className="text-xs font-medium text-muted-foreground">{t("remarks")}</h3>
            <p className="text-sm text-muted-foreground">{jobCard.remarks}</p>
          </>
        )}
        {jobCard.requested_materials && (
          <>
            <h3 className="text-xs font-medium text-muted-foreground">{t("requestedMaterials")}</h3>
            <p className="text-sm text-muted-foreground">{jobCard.requested_materials}</p>
          </>
        )}
      </div>

      {/* Conditions */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">{t("conditions")}</h2>
        <ConditionWizard conditions={conditionsInput} onChange={() => {}} readOnly />
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${t("confirmStatusChange")} "${confirmStatus ? JOB_STATUS_LABELS[confirmStatus] : ""}"?`}
        description={tc("cannotUndo")}
        confirmLabel={tc("confirm")}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
