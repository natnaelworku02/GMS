"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetVehiclesQuery, useGetOwnersQuery } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Vehicle } from "@/features/jobCards/types";
import CreateVehicleModal from "@/features/jobCards/components/CreateVehicleModal";

export default function VehiclesPage() {
  const t = useTranslations("vehicles");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: vehiclesResp, isLoading } = useGetVehiclesQuery({ page, page_size: 20, search: search || undefined });
  const { data: ownersResp } = useGetOwnersQuery({ page: 1, page_size: 100 });
  const vehicles = vehiclesResp?.items ?? [];
  const owners = ownersResp?.items ?? [];
  const total = vehiclesResp?.total ?? 0;
  const totalPages = vehiclesResp?.total_pages ?? 0;

  const getOwnerName = (ownerId: string) =>
    owners.find((o) => o.id === ownerId)?.name || "—";

  const columns: Column<Vehicle>[] = [
    {
      key: "plate_number",
      header: t("plateNumber"),
      render: (v) => (
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium">
          {v.plate_number}
        </span>
      ),
      sortable: true,
    },
    {
      key: "model",
      header: t("model"),
      render: (v) => <span className="font-medium">{v.model}</span>,
      sortable: true,
    },
    {
      key: "type",
      header: t("type"),
      render: (v) => <span className="text-muted-foreground">{v.type}</span>,
    },
    {
      key: "owner",
      header: t("owner"),
      render: (v) => (
        <span className="text-sm text-muted-foreground">{getOwnerName(v.owner_id)}</span>
      ),
    },
    {
      key: "engine_number",
      header: t("engineNumber"),
      render: (v) => <span className="font-mono text-xs text-muted-foreground">{v.engine_number}</span>,
    },
    {
      key: "chassis_number",
      header: t("chassisNumber"),
      render: (v) => <span className="font-mono text-xs text-muted-foreground">{v.chassis_number}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${total} vehicle${total !== 1 ? "s" : ""}`}
        action={
          <Can permission="job_cards.create">
            <Button onClick={() => setOpen(true)}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </Can>
        }
      />
      <div className="mt-6">
        <DataTable<Vehicle>
          columns={columns}
          data={vehicles}
          isLoading={isLoading}
          emptyMessage={t("noVehicles")}
          searchPlaceholder={t("searchPlaceholder")}
          searchValue={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
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

      <CreateVehicleModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
