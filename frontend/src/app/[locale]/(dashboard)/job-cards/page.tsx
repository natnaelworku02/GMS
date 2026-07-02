"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetJobCardsQuery, useGetVehiclesQuery, useGetOwnersQuery } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";
import { JOB_STATUS_LABELS } from "@/lib/constants";
import type { JobCard, Vehicle, Owner } from "@/features/jobCards/types";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...Object.entries(JOB_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export default function JobCardsPage() {
  const t = useTranslations("jobCards");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: jobCards = [], isLoading } = useGetJobCardsQuery(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const { data: vehicles = [] } = useGetVehiclesQuery();
  const { data: owners = [] } = useGetOwnersQuery();
  const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
  const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o]));

  const filtered = search
    ? jobCards.filter(
        (jc) =>
          jc.description.toLowerCase().includes(search.toLowerCase()) ||
          (vehicleMap[jc.vehicle_id]?.plate_number || "").toLowerCase().includes(search.toLowerCase()) ||
          (ownerMap[jc.owner_id]?.name || "").toLowerCase().includes(search.toLowerCase()),
      )
    : jobCards;

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
      header: "Created",
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
      ),
      className: "w-12 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${jobCards.length} card${jobCards.length !== 1 ? "s" : ""}`}
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plates, names, descriptions..."
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <DataTable<JobCard>
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No job cards found"
        />
      </div>
    </div>
  );
}
