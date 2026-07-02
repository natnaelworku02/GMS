"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateVehicleModal({ open, onOpenChange }: Props) {
  const t = useTranslations("vehicles");
  const tc = useTranslations("common");
  const [create, { isLoading }] = useCreateVehicleMutation();
  const { data: owners = [] } = useGetOwnersQuery();
  const [createOwner, { isLoading: creatingOwner }] = useCreateOwnerMutation();

  const [ownerId, setOwnerId] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState("");
  const [plate, setPlate] = useState("");
  const [engine, setEngine] = useState("");
  const [chassis, setChassis] = useState("");

  const [showNewOwner, setShowNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");

  const ownerOptions = owners.map((o) => ({
    value: o.id,
    label: o.name,
    subtitle: o.phone,
  }));

  const reset = () => {
    setOwnerId("");
    setModel("");
    setType("");
    setPlate("");
    setEngine("");
    setChassis("");
    setShowNewOwner(false);
    setNewOwnerName("");
    setNewOwnerPhone("");
  };

  const handleCreateOwner = useCallback(async () => {
    if (!newOwnerName.trim() || !newOwnerPhone.trim()) return;
    try {
      const owner = await createOwner({
        name: newOwnerName.trim(),
        phone: newOwnerPhone.trim(),
      }).unwrap();
      setOwnerId(owner.id);
      setShowNewOwner(false);
      setNewOwnerName("");
      setNewOwnerPhone("");
    } catch {
      toast.error(tc("error"));
    }
  }, [newOwnerName, newOwnerPhone, createOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !model.trim() || !plate.trim()) return;
    try {
      await create({
        owner_id: ownerId,
        model: model.trim(),
        type: type.trim() || "Other",
        plate_number: plate.trim(),
        engine_number: engine.trim() || "—",
        chassis_number: chassis.trim() || "—",
      }).unwrap();
      toast.success(tc("save"));
      reset();
      onOpenChange(false);
    } catch {
      toast.error(tc("error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); onOpenChange(val); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("owner")}</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={ownerOptions}
                    value={ownerId}
                    onSelect={(val) => setOwnerId(val)}
                    placeholder={t("selectOwner")}
                    searchPlaceholder={t("search") + "..."}
                    emptyText={tc("noResults")}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowNewOwner(true)} title={t("newOwner")}>
                  <Plus size={15} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="veh-model">{t("model")}</Label>
              <Input id="veh-model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="veh-type">{t("type")}</Label>
              <Input id="veh-type" value={type} onChange={(e) => setType(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="veh-plate">{t("plateNumber")}</Label>
              <Input id="veh-plate" className="font-mono" value={plate} onChange={(e) => setPlate(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="veh-engine">{t("engineNumber")}</Label>
                <Input id="veh-engine" className="font-mono" value={engine} onChange={(e) => setEngine(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veh-chassis">{t("chassisNumber")}</Label>
                <Input id="veh-chassis" className="font-mono" value={chassis} onChange={(e) => setChassis(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={isLoading || !ownerId || !model.trim() || !plate.trim()}>
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
