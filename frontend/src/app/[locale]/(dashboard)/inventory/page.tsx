"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetInventoryItemsQuery, useCreateInventoryItemMutation } from "@/features/inventory/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
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
import { Plus, MapPin, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { InventoryItem } from "@/features/inventory/types";

const VEHICLE_TYPE_OPTIONS = ["Pickup", "SUV", "Sedan", "Truck", "Bus", "Minibus", "Motorcycle"];

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const { data: items = [], isLoading } = useGetInventoryItemsQuery();

  const [open, setOpen] = useState(false);
  const [partName, setPartName] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [typeInput, setTypeInput] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [supplier, setSupplier] = useState("");
  const [create, { isLoading: creating }] = useCreateInventoryItemMutation();

  const vehicleTypesList = useMemo(() => {
    const types = new Set<string>();
    items.forEach((item) => (item.applicable_vehicle_types ?? []).forEach((vt) => types.add(vt)));
    return Array.from(types).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.part_name.toLowerCase().includes(q) ||
          item.supplier_info?.toLowerCase().includes(q),
      );
    }
    if (vehicleFilter) {
      result = result.filter((item) => (item.applicable_vehicle_types ?? []).includes(vehicleFilter));
    }
    return result;
  }, [items, search, vehicleFilter]);

  const addVehicleType = (vt: string) => {
    if (!vt || vehicleTypes.includes(vt)) return;
    setVehicleTypes((prev) => [...prev, vt]);
    setTypeInput("");
  };

  const removeVehicleType = (vt: string) => {
    setVehicleTypes((prev) => prev.filter((v) => v !== vt));
  };

  const handleCreate = async () => {
    if (!partName.trim() || vehicleTypes.length === 0) return;
    try {
      await create({
        part_name: partName.trim(),
        applicable_vehicle_types: vehicleTypes,
        unit_price: unitPrice,
        supplier_info: supplier.trim() || undefined,
        min_stock_threshold: threshold || undefined,
      }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      setPartName("");
      setVehicleTypes([]);
      setTypeInput("");
      setUnitPrice(0);
      setThreshold(0);
      setSupplier("");
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
      ),
      className: "w-12 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${items.length} item${items.length !== 1 ? "s" : ""}`}
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
          {vehicleTypesList.length > 0 && (
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("allVehicleTypes")}</option>
              {vehicleTypesList.map((vt) => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
          )}
        </div>
        <DataTable<InventoryItem>
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={t("noItems")}
          searchPlaceholder={t("partName") + "..."}
          searchValue={search}
          onSearch={setSearch}
          onRowClick={(item) => router.push(`/inventory/${item.id}`)}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createItem")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-name">{t("partName")}</Label>
              <Input id="inv-name" value={partName} onChange={(e) => setPartName(e.target.value)} />
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inv-price">{t("unitPrice")}</Label>
                <Input id="inv-price" type="number" min={0} step={0.01} value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-threshold">{t("minStockThreshold")}</Label>
                <Input id="inv-threshold" type="number" min={0} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-supplier">{t("supplierInfo")}</Label>
              <Input id="inv-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={creating || !partName.trim() || vehicleTypes.length === 0}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? tc("loading") : t("createItem")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
