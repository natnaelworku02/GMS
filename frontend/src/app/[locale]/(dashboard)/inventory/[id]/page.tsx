"use client";

import { useState, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetInventoryItemQuery, useGetInventoryLocationsQuery, useAdjustStockMutation } from "@/features/inventory/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { stockAdjustSchema } from "@/lib/formSchemas";
import { z } from "zod";
type StockAdjustFormData = z.input<typeof stockAdjustSchema>;
import type { StockEntry } from "@/features/inventory/types";

export default function InventoryItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("inventory");
  const router = useRouter();
  const { data: item, isLoading } = useGetInventoryItemQuery(id);
  const { data: locationsResp } = useGetInventoryLocationsQuery({ page: 1, page_size: 100 });
  const locations = locationsResp?.items ?? [];
  const [adjustStock, { isLoading: isAdjusting }] = useAdjustStockMutation();

  const [confirmStock, setConfirmStock] = useState(false);
  const [pendingData, setPendingData] = useState<StockAdjustFormData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockAdjustFormData>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: { store_location_id: "", quantity: 0 },
  });

  const selectedLocation = watch("store_location_id") ?? "";

  const totalStock = (entries: StockEntry[]) =>
    entries.reduce((sum, se) => sum + se.quantity, 0);

  const locationName = (locId: string) =>
    locations.find((l) => l.id === locId)?.name || locId;

  const handleAdjust = (data: StockAdjustFormData) => {
    setPendingData(data);
    setConfirmStock(true);
  };

  const confirmAdjustStock = async () => {
    if (!pendingData) return;
    try {
      await adjustStock({
        item_id: id,
        store_location_id: pendingData.store_location_id,
        quantity: pendingData.quantity,
      }).unwrap();
      reset({ store_location_id: "", quantity: 0 });
      setConfirmStock(false);
      setPendingData(null);
    } catch {
      toast.error("Failed to adjust stock");
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
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No stock entries</p>
            </div>
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
        <form onSubmit={handleSubmit(handleAdjust)} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">Adjust Stock</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-xs">{t("location")}</Label>
              <Select value={selectedLocation || null} onValueChange={(v) => setValue("store_location_id", v || "", { shouldValidate: true })}>
                <SelectTrigger id="loc" className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.store_location_id && <p className="text-xs text-destructive">{errors.store_location_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty" className="text-xs">{t("quantity")}</Label>
              <Input
                id="qty"
                type="number"
                min={0}
                {...register("quantity", { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isAdjusting}
                className="w-full"
              >
                {isAdjusting && <Loader2 className="h-4 w-4 animate-spin" />}
                Set Stock
              </Button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmStock}
        onOpenChange={setConfirmStock}
        title="Set Stock"
        description={`Set stock at location ${locationName(pendingData?.store_location_id ?? "")} to ${pendingData?.quantity ?? 0}?`}
        confirmLabel="Set"
        onConfirm={confirmAdjustStock}
      />
    </div>
  );
}
