"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetJobCardQuery, useUpdateJobCardStatusMutation } from "@/features/jobCards/api";
import { useGetUsersQuery } from "@/features/auth/api";
import { StatusTimeline } from "@/features/jobCards/components/StatusTimeline";
import { ConditionWizard } from "@/features/jobCards/components/ConditionWizard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ArrowLeft, Pencil, Loader2, Clock, User } from "lucide-react";
import { JOB_STATUS_LABELS, JOB_STATUS_TRANSITIONS, STAFF_ROLES } from "@/lib/constants";
import type { VehicleConditionInput } from "@/features/jobCards/types";

export default function JobCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const t = useTranslations("jobCards");
  const router = useRouter();
  const { data: jobCard, isLoading } = useGetJobCardQuery(id, { skip: !id });
  const { data: users = [] } = useGetUsersQuery();
  const [updateStatus, { isLoading: isTransitioning }] = useUpdateJobCardStatusMutation();
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openConfirm = (status: string) => {
    setConfirmStatus(status);
    setDialogOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!jobCard) return <div className="p-8 text-center text-muted-foreground">Job card not found</div>;

  const validTransitions = JOB_STATUS_TRANSITIONS[jobCard.status] || [];
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
          Back to Job Cards
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/job-cards/${id}/edit`)}>
            <Pencil size={14} />
            Edit
          </Button>
          {validTransitions.length > 0 && (
            <div className="flex gap-2">
              {validTransitions.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  size="sm"
                  onClick={() => openConfirm(nextStatus)}
                  disabled={isTransitioning}
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
              {jobCard.vehicle.model}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {jobCard.vehicle.plate_number}
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
            Created by {creator?.full_name || jobCard.created_by}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {new Date(jobCard.created_at).toLocaleDateString()}
          </span>
          {jobCard.updated_at !== jobCard.created_at && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              Updated {new Date(jobCard.updated_at).toLocaleDateString()}
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
          <p className="text-sm">{jobCard.owner.name}</p>
          <p className="text-xs text-muted-foreground">{jobCard.owner.phone}</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("vehicle")}</h2>
          <p className="text-sm">{jobCard.vehicle.model}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{t("plateNumber")}: {jobCard.vehicle.plate_number}</span>
            <span className="font-mono">{t("engineNumber")}: {jobCard.vehicle.engine_number}</span>
            <span className="font-mono">{t("chassisNumber")}: {jobCard.vehicle.chassis_number}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">Details</h2>
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
              <span>{jobCard.private_paint ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("privateMechanic")}</span>
              <span>{jobCard.private_mechanic ? "Yes" : "No"}</span>
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
          {!jobCard.staff_assignments || jobCard.staff_assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff assigned</p>
          ) : (
            <div className="space-y-2">
              {jobCard.staff_assignments.map((sa, idx) => {
                const role = STAFF_ROLES.find((r) => r.value === sa.role);
                return (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sa.employee_name}</span>
                    <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-500">
                      {role?.label || sa.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
        title={`Change status to "${confirmStatus ? JOB_STATUS_LABELS[confirmStatus] : ""}"?`}
        description="This action cannot be undone."
        confirmLabel="Confirm"
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
