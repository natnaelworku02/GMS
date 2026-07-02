"use client";

import { useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateVehicleMutation, useGetOwnersQuery, useCreateOwnerMutation } from "@/features/jobCards/api";
import { vehicleCreateSchema, type VehicleCreateFormData } from "@/lib/formSchemas";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function NewVehiclePage() {
  const t = useTranslations("vehicles");
  const tc = useTranslations("common");
  const router = useRouter();
  const [create, { isLoading }] = useCreateVehicleMutation();
  const { data: owners = [] } = useGetOwnersQuery();
  const [createOwner, { isLoading: creatingOwner }] = useCreateOwnerMutation();
  const [showNewOwner, setShowNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<VehicleCreateFormData>({
    resolver: zodResolver(vehicleCreateSchema),
  });

  const ownerId = watch("owner_id");
  const ownerOptions = owners.map((o) => ({
    value: o.id,
    label: o.name,
    subtitle: o.phone,
  }));

  const handleCreateOwner = useCallback(async () => {
    if (!newOwnerName.trim() || !newOwnerPhone.trim()) return;
    try {
      const owner = await createOwner({
        name: newOwnerName.trim(),
        phone: newOwnerPhone.trim(),
      }).unwrap();
      setValue("owner_id", owner.id);
      setShowNewOwner(false);
      setNewOwnerName("");
      setNewOwnerPhone("");
    } catch {
      toast.error(tc("error"));
    }
  }, [newOwnerName, newOwnerPhone, createOwner, setValue, setError]);

  const onSubmit = async (data: VehicleCreateFormData) => {
    try {
      await create({
        owner_id: data.owner_id,
        model: data.model,
        type: data.type,
        plate_number: data.plate_number,
        engine_number: data.engine_number,
        chassis_number: data.chassis_number,
      }).unwrap();
      toast.success(tc("save"));
      router.push("/vehicles");
    } catch {
      toast.error(tc("error"));
    }
  };

  return (
    <div className="mx-auto max-w-xl pb-24">
      <Button variant="ghost" onClick={() => router.push("/vehicles")} className="mb-6">
        <ArrowLeft size={15} />
        {tc("back")} {t("title")}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <Label>{t("owner")}</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  options={ownerOptions}
                  value={ownerId}
                  onSelect={(val) => setValue("owner_id", val, { shouldValidate: true })}
                  placeholder={t("selectOwner")}
                  searchPlaceholder={t("search") + "..."}
                  emptyText={t("noVehicles")}
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setShowNewOwner(true)} title={t("newOwner")}>
                <Plus size={15} />
              </Button>
            </div>
            {errors.owner_id && <p className="text-sm text-destructive">{errors.owner_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">{t("model")}</Label>
            <Input id="model" {...register("model")} />
            {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t("type")}</Label>
            <Input id="type" {...register("type")} />
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate">{t("plateNumber")}</Label>
            <Input id="plate" className="font-mono" {...register("plate_number")} />
            {errors.plate_number && <p className="text-sm text-destructive">{errors.plate_number.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="engine">{t("engineNumber")}</Label>
              <Input id="engine" className="font-mono" {...register("engine_number")} />
              {errors.engine_number && <p className="text-sm text-destructive">{errors.engine_number.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chassis">{t("chassisNumber")}</Label>
              <Input id="chassis" className="font-mono" {...register("chassis_number")} />
              {errors.chassis_number && <p className="text-sm text-destructive">{errors.chassis_number.message}</p>}
            </div>
          </div>

        </div>

        <div className="hidden md:block">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? "Creating..." : t("create")}
          </Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{t("create")}</span>
            <Button type="submit" disabled={isLoading} className="min-w-32">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? tc("loading") : t("create")}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={showNewOwner} onOpenChange={setShowNewOwner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newOwner")}</DialogTitle>
            <DialogDescription>{t("create")} {t("owner")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="vno_name">{t("owner")}</Label>
              <input id="vno_name" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vno_phone">Phone</Label>
              <input id="vno_phone" value={newOwnerPhone} onChange={(e) => setNewOwnerPhone(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOwner(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreateOwner} disabled={creatingOwner || !newOwnerName.trim() || !newOwnerPhone.trim()}>
              {creatingOwner && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("newOwner")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
