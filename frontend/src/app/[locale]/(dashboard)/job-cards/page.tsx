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
import { getApiErrorMessage } from "@/lib/utils";
import type { JobCard } from "@/features/jobCards/types";

const JOB_STATUSES = ["pending_inspection", "waiting_for_approval", "in_repair", "waiting_for_parts", "ready_for_testing", "completed"];

const STATUS_OPTIONS = (t: (key: string) => string) => [
  { value: "", label: t("allStatuses") },
  ...JOB_STATUSES.map((value) => ({ value, label: t(value) })),
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
      toast.success(t("deleted"));
      setDeleteTarget(null);
    } catch (error) {
      const msg = getApiErrorMessage(error, t("deleteError"));
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
      render: (jc) => <StatusBadge status={jc.status} label={t(jc.status)} />,
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
            aria-label={t("viewJobCard")}
          >
            <Eye size={14} />
          </Button>
          <Can permission="job_cards.delete">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setDeleteTarget(jc);
              }}
              aria-label={t("deleteJobCard")}
            >
              <Trash2 size={14} className="text-destructive" />
            </Button>
          </Can>
        </div>
      ),
      className: "w-20 text-right",
      hideOnMobile: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={t("count", { count: total })}
        action={
          <Can permission="job_cards.create">
            <Button onClick={() => router.push("/job-cards/new")}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </Can>
        }
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("searchPlaceholder")}
            className="flex h-10 w-full rounded-full border border-border/60 bg-muted/40 pl-3 pr-3 text-sm transition-all focus:border-primary/30 focus:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-full border border-border/60 bg-muted/40 px-3 text-sm transition-all focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10"
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
          serverTotal={total}
          serverPage={page}
          serverPageSize={20}
          onServerPageChange={setPage}
          onRowClick={(jobCard) => router.push(`/job-cards/${jobCard.id}`)}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={t("deleteJobCard")}
        description={t("deleteConfirmation")}
        confirmLabel={deleting ? t("deleting") : tc("delete")}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
