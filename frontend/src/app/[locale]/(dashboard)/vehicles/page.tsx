"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetVehiclesQuery, useGetOwnersQuery, useDeleteVehicleMutation } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleteVehicle, { isLoading: deleting }] = useDeleteVehicleMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVehicle(deleteTarget.id).unwrap();
      toast.success("Vehicle deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete vehicle";
      toast.error(msg);
    }
  };

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
    {
      key: "actions",
      header: "",
      render: (v) => (
        <Can permission="job_cards.delete">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setDeleteTarget(v);
            }}
          >
            <Trash2 size={14} className="text-destructive" />
          </Button>
        </Can>
      ),
      className: "w-12 text-right",
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
          serverTotal={total}
          serverPage={page}
          serverPageSize={20}
          onServerPageChange={setPage}
        />
      </div>

      <CreateVehicleModal open={open} onOpenChange={setOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Vehicle"
        description={`Are you sure you want to delete ${deleteTarget?.model} (${deleteTarget?.plate_number})? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
