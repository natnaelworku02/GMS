"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetInventoryLocationsQuery, useUpdateInventoryLocationMutation, useDeleteInventoryLocationMutation } from "@/features/inventory/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, ArrowLeft, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { InventoryLocation } from "@/features/inventory/types";

export default function InventoryLocationsPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: locationsResp, isLoading } = useGetInventoryLocationsQuery({ page, page_size: 20, search: searchQuery || undefined });
  const locations = locationsResp?.items ?? [];
  const total = locationsResp?.total ?? 0;
  const totalPages = locationsResp?.total_pages ?? 0;

  const [updateLocation, { isLoading: isUpdating }] = useUpdateInventoryLocationMutation();
  const [deleteTarget, setDeleteTarget] = useState<InventoryLocation | null>(null);
  const [deleteLocation, { isLoading: deleting }] = useDeleteInventoryLocationMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLocation(deleteTarget.id).unwrap();
      toast.success("Location deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete location";
      toast.error(msg);
    }
  };
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);
  const [editName, setEditName] = useState("");

  const openEdit = (loc: InventoryLocation) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditDialogOpen(true);
  };

  const confirmEdit = async () => {
    if (!editingLocation || !editName.trim()) return;
    try {
      await updateLocation({ id: editingLocation.id, name: editName.trim() }).unwrap();
      toast.success(tc("save"));
      setEditDialogOpen(false);
      setEditingLocation(null);
    } catch {
      toast.error(tc("error"));
    }
  };

  const columns: Column<InventoryLocation>[] = [
    {
      key: "name",
      header: t("location"),
      render: (l) => <span className="font-medium">{l.name}</span>,
      sortable: true,
    },
    {
      key: "created_at",
      header: tc("createdAt"),
      render: (l) => (
        <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: tc("actions"),
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(l); }}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(l); }}>
            <Trash2 size={14} className="text-destructive" />
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" onClick={() => router.push("/inventory")} className="mb-4">
        <ArrowLeft size={15} />
        {tc("back")} to {t("title")}
      </Button>
      <PageHeader
        title={t("locations")}
        description={`${total} location${total !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => router.push("/inventory/locations/new")}>
            <Plus size={15} />
            {t("createLocation")}
          </Button>
        }
      />
      <div className="mt-6">
        <DataTable<InventoryLocation>
          columns={columns}
          data={locations}
          isLoading={isLoading}
          emptyMessage={t("noLocations")}
          searchValue={searchQuery}
          onSearch={(v) => { setSearchQuery(v); setPage(1); }}
          searchPlaceholder={t("searchPlaceholder") || tc("search")}
          serverTotal={total}
          serverPage={page}
          serverPageSize={20}
          onServerPageChange={setPage}
        />
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-loc-name">Name</Label>
            <Input id="edit-loc-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={confirmEdit} disabled={isUpdating || !editName.trim()}>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Location"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
