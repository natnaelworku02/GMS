"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetInventoryItemQuery, useGetInventoryLocationsQuery, useAdjustStockMutation } from "@/features/inventory/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { StockEntry } from "@/features/inventory/types";

export default function InventoryItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const t = useTranslations("inventory");
  const router = useRouter();
  const { data: item, isLoading } = useGetInventoryItemQuery(id, { skip: !id });
  const { data: locations = [] } = useGetInventoryLocationsQuery();
  const [adjustStock, { isLoading: isAdjusting }] = useAdjustStockMutation();

  const [selectedLocation, setSelectedLocation] = useState("");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const totalStock = (entries: StockEntry[]) =>
    entries.reduce((sum, se) => sum + se.quantity, 0);

  const locationName = (locId: string) =>
    locations.find((l) => l.id === locId)?.name || locId;

  const handleAdjust = async () => {
    if (!selectedLocation) {
      setAdjustError(t("selectLocation"));
      return;
    }
    setAdjustError(null);
    try {
      await adjustStock({
        item_id: id,
        store_location_id: selectedLocation,
        quantity: adjustQty,
      }).unwrap();
      setSelectedLocation("");
      setAdjustQty(0);
    } catch {
      setAdjustError("Failed to adjust stock");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => router.push("/inventory")} className="mb-6">
          <ArrowLeft size={15} />
          Back to Inventory
        </Button>
        <p className="text-sm text-destructive">Item not found</p>
      </div>
    );
  }

  const total = totalStock(item.stock_entries);
  const isLow = item.min_stock_threshold > 0 && total < item.min_stock_threshold;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <Button variant="ghost" onClick={() => router.push("/inventory")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Inventory
      </Button>

      <div className="space-y-6">
        {/* Item Details */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold">{item.part_name}</h1>
              <p className="text-sm text-muted-foreground">{item.id}</p>
            </div>
            {isLow && <Badge variant="destructive">{t("lowStock")}</Badge>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("unitPrice")}</p>
              <p className="font-medium">{fmt(item.unit_price)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("minStockThreshold")}</p>
              <p className="font-medium">{item.min_stock_threshold || "—"}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("currentStock")}</p>
            <p className={isLow ? "text-lg font-semibold text-destructive" : "text-lg font-semibold"}>
              {total}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("supplierInfo")}</p>
            <p className="text-sm">{item.supplier_info || "—"}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <p className="text-xs text-muted-foreground w-full">{t("applicableVehicles")}</p>
            {(item.applicable_vehicle_types ?? []).map((vt) => (
              <Badge key={vt} variant="outline" className="text-xs">{vt}</Badge>
            ))}
          </div>
        </div>

        {/* Stock Entries by Location */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">{t("currentStock")} — by Location</h2>
          {item.stock_entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock entries</p>
          ) : (
            <div className="divide-y divide-border">
              {item.stock_entries.map((se) => (
                <div key={se.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{locationName(se.store_location_id)}</span>
                  <span className="font-medium">{se.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Adjustment */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">Adjust Stock</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-xs">{t("location")}</Label>
              <select
                id="loc"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty" className="text-xs">{t("quantity")}</Label>
              <Input
                id="qty"
                type="number"
                min={0}
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleAdjust}
                disabled={isAdjusting || !selectedLocation}
                className="w-full"
              >
                {isAdjusting && <Loader2 className="h-4 w-4 animate-spin" />}
                Set Stock
              </Button>
            </div>
          </div>
          {adjustError && <p className="text-sm text-destructive">{adjustError}</p>}
        </div>
      </div>
    </div>
  );
}
