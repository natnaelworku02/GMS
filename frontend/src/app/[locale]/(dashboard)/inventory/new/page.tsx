"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateInventoryItemMutation } from "@/features/inventory/api";
import { inventoryItemSchema, type InventoryItemFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_TYPE_OPTIONS = ["Pickup", "SUV", "Sedan", "Truck", "Bus", "Minibus", "Motorcycle"];

export default function NewInventoryItemPage() {
  const t = useTranslations("inventory");
  const router = useRouter();
  const [create, { isLoading }] = useCreateInventoryItemMutation();
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [typeInput, setTypeInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      applicable_vehicle_types: [],
      unit_price: 0,
      min_stock_threshold: 0,
    },
  });

  const addVehicleType = (vt: string) => {
    if (!vt || vehicleTypes.includes(vt)) return;
    const next = [...vehicleTypes, vt];
    setVehicleTypes(next);
    setValue("applicable_vehicle_types", next, { shouldValidate: true });
    setTypeInput("");
  };

  const removeVehicleType = (vt: string) => {
    const next = vehicleTypes.filter((v) => v !== vt);
    setVehicleTypes(next);
    setValue("applicable_vehicle_types", next, { shouldValidate: true });
  };

  const onSubmit = async (data: InventoryItemFormData) => {
    try {
      await create({
        part_name: data.part_name,
        applicable_vehicle_types: data.applicable_vehicle_types,
        unit_price: data.unit_price,
        supplier_info: data.supplier_info || undefined,
        min_stock_threshold: data.min_stock_threshold || undefined,
      }).unwrap();
      toast.success("Item created successfully");
      router.push("/inventory");
    } catch {
      toast.error("Failed to create item");
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" onClick={() => router.push("/inventory")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Inventory
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("createItem")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <Label htmlFor="part_name">{t("partName")}</Label>
          <Input id="part_name" {...register("part_name")} />
          {errors.part_name && <p className="text-sm text-destructive">{errors.part_name.message}</p>}
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
              list="vehicle-types"
              value={typeInput}
              onChange={(e) => setTypeInput(e.target.value)}
              placeholder={t("typeOrSelect")}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => addVehicleType(typeInput)}>
              Add
            </Button>
          </div>
          <datalist id="vehicle-types">
            {VEHICLE_TYPE_OPTIONS.filter((o) => !vehicleTypes.includes(o)).map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          {errors.applicable_vehicle_types && (
            <p className="text-sm text-destructive">{errors.applicable_vehicle_types.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unit_price">{t("unitPrice")}</Label>
            <Input id="unit_price" type="number" min={0} step={0.01} {...register("unit_price", { valueAsNumber: true })} />
            {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_stock_threshold">{t("minStockThreshold")}</Label>
            <Input id="min_stock_threshold" type="number" min={0} {...register("min_stock_threshold", { valueAsNumber: true })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier_info">{t("supplierInfo")}</Label>
          <Input id="supplier_info" {...register("supplier_info")} />
        </div>

        <div className="hidden md:block">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? "Creating..." : t("createItem")}
          </Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{t("createItem")}</span>
            <Button type="submit" disabled={isLoading} className="min-w-32">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Creating..." : t("createItem")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
