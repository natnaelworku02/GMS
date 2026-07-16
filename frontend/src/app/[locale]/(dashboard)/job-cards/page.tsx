"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetJobCardsQuery, useGetVehiclesQuery, useGetOwnersQuery, useDeleteJobCardMutation } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { JOB_STATUS_LABELS } from "@/lib/constants";
import type { JobCard, Vehicle, Owner } from "@/features/jobCards/types";

const STATUS_OPTIONS = (t: (key: string) => string) => [
  { value: "", label: t("allStatuses") },
  ...Object.entries(JOB_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export default function JobCardsPage() {
  const t = useTranslations("jobCards");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: jobCardsResp, isLoading } = useGetJobCardsQuery({
    page,
    page_size: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const jobCards = jobCardsResp?.items ?? [];
  const total = jobCardsResp?.total ?? 0;
  const totalPages = jobCardsResp?.total_pages ?? 0;

  const { data: vehiclesResp } = useGetVehiclesQuery({ page: 1, page_size: 100 });
  const vehicles = vehiclesResp?.items ?? [];
  const { data: ownersResp } = useGetOwnersQuery({ page: 1, page_size: 100 });
  const owners = ownersResp?.items ?? [];
  const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
  const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o]));
  const [deleteTarget, setDeleteTarget] = useState<JobCard | null>(null);
  const [deleteJobCard, { isLoading: deleting }] = useDeleteJobCardMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteJobCard(deleteTarget.id).unwrap();
      toast.success("Job card deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete job card";
      toast.error(msg);
    }
  };

  const columns: Column<JobCard>[] = [
    {
      key: "vehicle",
      header: t("vehicle"),
      render: (jc) => (
        <div>
          <p className="font-medium">{vehicleMap[jc.vehicle_id]?.model || "—"}</p>
          <p className="font-mono text-xs text-muted-foreground">{vehicleMap[jc.vehicle_id]?.plate_number || "—"}</p>
        </div>
      ),
    },
    {
      key: "owner",
      header: t("owner"),
      render: (jc) => <span className="text-sm text-muted-foreground">{ownerMap[jc.owner_id]?.name || "—"}</span>,
    },
    {
      key: "description",
      header: t("description"),
      render: (jc) => (
        <span className="max-w-[200px] truncate text-sm text-muted-foreground">
          {jc.description}
        </span>
      ),
    },
    {
      key: "status",
      header: t("status"),
      render: (jc) =>                   <StatusBadge status={jc.status} />,
      sortable: true,
    },
    {
      key: "created_at",
      header: tc("createdAt"),
      render: (jc) => (
        <span className="text-muted-foreground">
          {new Date(jc.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "",
      render: (jc) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              router.push(`/job-cards/${jc.id}`);
            }}
          >
            <Eye size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setDeleteTarget(jc);
            }}
          >
            <Trash2 size={14} className="text-destructive" />
          </Button>
        </div>
      ),
      className: "w-20 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${total} card${total !== 1 ? "s" : ""}`}
        action={
          <Can permission="job_cards.create">
            <Button onClick={() => router.push("/job-cards/new")}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </Can>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("searchPlaceholder")}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS(t).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <DataTable<JobCard>
          columns={columns}
          data={jobCards}
          isLoading={isLoading}
          emptyMessage={t("noJobCards")}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Job Card"
        description="Are you sure you want to delete this job card? This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
