"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetInventoryItemsQuery } from "@/features/inventory/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Pencil } from "lucide-react";
import type { InventoryItem } from "@/features/inventory/types";

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const { data: items = [], isLoading } = useGetInventoryItemsQuery();

  const vehicleTypes = useMemo(() => {
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
            <Button onClick={() => router.push("/inventory/new")}>
              <Plus size={15} />
              {t("createItem")}
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        <div className="mb-4 flex items-center gap-3">
          {vehicleTypes.length > 0 && (
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("allVehicleTypes")}</option>
              {vehicleTypes.map((vt) => (
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
    </div>
  );
}
