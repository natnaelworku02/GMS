"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetInventoryItemsQuery, useCreateInventoryItemMutation, useDeleteInventoryItemMutation } from "@/features/inventory/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, MapPin, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { inventoryItemSchema, type InventoryItemFormData } from "@/lib/formSchemas";
import type { InventoryItem } from "@/features/inventory/types";

const VEHICLE_TYPE_OPTIONS = ["Pickup", "SUV", "Sedan", "Truck", "Bus", "Minibus", "Motorcycle"];

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const { data: itemsResp, isLoading } = useGetInventoryItemsQuery({
    page,
    page_size: 20,
    search: search || undefined,
    vehicle_type: vehicleFilter || undefined,
  });
  const items = itemsResp?.items ?? [];
  const total = itemsResp?.total ?? 0;
  const totalPages = itemsResp?.total_pages ?? 0;

  const [open, setOpen] = useState(false);
  const [typeInput, setTypeInput] = useState("");
  const [create, { isLoading: creating }] = useCreateInventoryItemMutation();
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleteItem, { isLoading: deleting }] = useDeleteInventoryItemMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.id).unwrap();
      toast.success("Item deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete item";
      toast.error(msg);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: { applicable_vehicle_types: [], supplier_info: "", min_stock_threshold: undefined },
  });

  const vehicleTypes = watch("applicable_vehicle_types") ?? [];

  const addVehicleType = (vt: string) => {
    if (!vt || vehicleTypes.includes(vt)) return;
    setValue("applicable_vehicle_types", [...vehicleTypes, vt], { shouldValidate: true });
    setTypeInput("");
  };

  const removeVehicleType = (vt: string) => {
    setValue("applicable_vehicle_types", vehicleTypes.filter((v) => v !== vt), { shouldValidate: true });
  };

  const onCreate = async (data: InventoryItemFormData) => {
    try {
      await create({
        part_name: data.part_name.trim(),
        applicable_vehicle_types: data.applicable_vehicle_types,
        unit_price: data.unit_price,
        supplier_info: data.supplier_info?.trim() || undefined,
        min_stock_threshold: data.min_stock_threshold || undefined,
      }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      reset({ applicable_vehicle_types: [], supplier_info: "", min_stock_threshold: undefined });
      setTypeInput("");
    } catch {
      toast.error(tc("error"));
    }
  };

  const totalStock = (item: InventoryItem) =>
    item.stock_entries.reduce((sum, se) => sum + se.quantity, 0);

  const isLowStock = (item: InventoryItem) => {
    if (!item.min_stock_threshold) return false;
    return totalStock(item) < item.min_stock_threshold;
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  const columns: Column<InventoryItem>[] = [
    {
      key: "part_name",
      header: t("partName"),
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.part_name}</span>
          {isLowStock(item) && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {t("lowStock")}
            </Badge>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: "unit_price",
      header: t("unitPrice"),
      render: (item) => <span className="text-muted-foreground">{fmt(item.unit_price)}</span>,
      sortable: true,
    },
    {
      key: "stock",
      header: t("currentStock"),
      render: (item) => {
        const total = totalStock(item);
        return (
          <span className={total < (item.min_stock_threshold || 0) ? "text-destructive font-medium" : ""}>
            {total}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "min_stock_threshold",
      header: t("minStockThreshold"),
      render: (item) => (
        <span className="text-muted-foreground">{item.min_stock_threshold || "—"}</span>
      ),
    },
    {
      key: "applicable_vehicle_types",
      header: t("applicableVehicles"),
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {(item.applicable_vehicle_types ?? []).map((vt) => (
            <Badge key={vt} variant="outline" className="text-[10px]">
              {vt}
            </Badge>
          ))}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              router.push(`/inventory/${item.id}`);
            }}
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setDeleteTarget(item);
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
        description={`${total} item${total !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/inventory/locations")}>
              <MapPin size={14} />
              {t("locations")}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={15} />
              {t("createItem")}
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        <div className="mb-4 flex items-center gap-3">
          <select
            value={vehicleFilter}
            onChange={(e) => { setVehicleFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("allVehicleTypes")}</option>
            {VEHICLE_TYPE_OPTIONS.map((vt) => (
              <option key={vt} value={vt}>{vt}</option>
            ))}
          </select>
        </div>
        <DataTable<InventoryItem>
          columns={columns}
          data={items}
          isLoading={isLoading}
          emptyMessage={t("noItems")}
          searchPlaceholder={t("partName") + "..."}
          searchValue={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          onRowClick={(item) => router.push(`/inventory/${item.id}`)}
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

      <Dialog open={open} onOpenChange={(v) => { if (!v) { reset({ applicable_vehicle_types: [], supplier_info: "", min_stock_threshold: undefined }); setTypeInput(""); } setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createItem")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-name">{t("partName")}</Label>
              <Input id="inv-name" {...register("part_name")} />
              {errors.part_name && <p className="text-xs text-destructive">{errors.part_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t("applicableVehicles")}</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {vehicleTypes.map((vt) => (
                  <span
                    key={vt}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-500"
                  >
                    {vt}
                    <button type="button" onClick={() => removeVehicleType(vt)} className="hover:text-indigo-700">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  list="inv-vehicle-types"
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value)}
                  placeholder={t("typeOrSelect")}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addVehicleType(typeInput)}>
                  Add
                </Button>
              </div>
              <datalist id="inv-vehicle-types">
                {VEHICLE_TYPE_OPTIONS.filter((o) => !vehicleTypes.includes(o)).map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
              {errors.applicable_vehicle_types && <p className="text-xs text-destructive">{errors.applicable_vehicle_types.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inv-price">{t("unitPrice")}</Label>
                <Input id="inv-price" type="number" step={0.01} {...register("unit_price", { valueAsNumber: true })} />
                {errors.unit_price && <p className="text-xs text-destructive">{errors.unit_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-threshold">{t("minStockThreshold")}</Label>
                <Input id="inv-threshold" type="number" {...register("min_stock_threshold", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-supplier">{t("supplierInfo")}</Label>
              <Input id="inv-supplier" {...register("supplier_info")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { reset({ applicable_vehicle_types: [], supplier_info: "", min_stock_threshold: undefined }); setTypeInput(""); setOpen(false); }}>{tc("cancel")}</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? tc("loading") : t("createItem")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Item"
        description={`Are you sure you want to delete ${deleteTarget?.part_name}? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
