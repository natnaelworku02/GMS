"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateVehicleMutation, useGetOwnersQuery, useCreateOwnerMutation } from "@/features/jobCards/api";
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
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { vehicleCreateSchema, type VehicleCreateFormData } from "@/lib/formSchemas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateVehicleModal({ open, onOpenChange }: Props) {
  const t = useTranslations("vehicles");
  const tc = useTranslations("common");
  const [create, { isLoading }] = useCreateVehicleMutation();
  const { data: ownersResp } = useGetOwnersQuery({ page: 1, page_size: 100 });
  const owners = ownersResp?.items ?? [];
  const [createOwner, { isLoading: creatingOwner }] = useCreateOwnerMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VehicleCreateFormData>({
    resolver: zodResolver(vehicleCreateSchema),
    defaultValues: { engine_number: "", chassis_number: "" },
  });

  const ownerId = watch("owner_id");
  const [showNewOwner, setShowNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");

  const ownerOptions = owners.map((o) => ({
    value: o.id,
    label: o.name,
    subtitle: o.phone,
  }));

  const resetAll = () => {
    reset();
    setShowNewOwner(false);
    setNewOwnerName("");
    setNewOwnerPhone("");
  };

  const handleCreateOwner = async () => {
    if (!newOwnerName.trim() || !newOwnerPhone.trim()) return;
    try {
      const owner = await createOwner({
        name: newOwnerName.trim(),
        phone: newOwnerPhone.trim(),
      }).unwrap();
      setValue("owner_id", owner.id, { shouldValidate: true });
      setShowNewOwner(false);
      setNewOwnerName("");
      setNewOwnerPhone("");
    } catch {
      toast.error(tc("error"));
    }
  };

  const onSubmit = async (data: VehicleCreateFormData) => {
    try {
      await create({
        owner_id: data.owner_id,
        model: data.model.trim(),
        type: data.type.trim() || "Other",
        plate_number: data.plate_number.trim(),
        engine_number: data.engine_number?.trim() || "—",
        chassis_number: data.chassis_number?.trim() || "—",
      }).unwrap();
      toast.success(tc("save"));
      resetAll();
      onOpenChange(false);
    } catch {
      toast.error(tc("error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { if (!val) resetAll(); onOpenChange(val); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("owner")}</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={ownerOptions}
                    value={ownerId ?? ""}
                    onSelect={(val) => setValue("owner_id", val, { shouldValidate: true })}
                    placeholder={t("selectOwner")}
                    searchPlaceholder={t("search") + "..."}
                    emptyText={tc("noResults")}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowNewOwner(true)} title={t("newOwner")}>
                  <Plus size={15} />
                </Button>
              </div>
              {errors.owner_id && <p className="text-xs text-destructive">{errors.owner_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="veh-model">{t("model")}</Label>
              <Input id="veh-model" {...register("model")} />
              {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="veh-type">{t("type")}</Label>
              <Input id="veh-type" {...register("type")} />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="veh-plate">{t("plateNumber")}</Label>
              <Input id="veh-plate" className="font-mono" {...register("plate_number")} />
              {errors.plate_number && <p className="text-xs text-destructive">{errors.plate_number.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="veh-engine">{t("engineNumber")}</Label>
                <Input id="veh-engine" className="font-mono" {...register("engine_number")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veh-chassis">{t("chassisNumber")}</Label>
                <Input id="veh-chassis" className="font-mono" {...register("chassis_number")} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? tc("loading") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="vno_phone">{t("phone")}</Label>
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
    </>
  );
}
