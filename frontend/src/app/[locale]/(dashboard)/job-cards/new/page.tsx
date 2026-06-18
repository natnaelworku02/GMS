"use client";

import { useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateJobCardMutation,
  useGetOwnersQuery,
  useGetVehiclesQuery,
  useCreateOwnerMutation,
  useCreateVehicleMutation,
} from "@/features/jobCards/api";
import { ConditionWizard } from "@/features/jobCards/components/ConditionWizard";
import { MechanicAssign } from "@/features/jobCards/components/MechanicAssign";
import { jobCardCreateSchema, type JobCardCreateFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import type { VehicleConditionInput, StaffAssignmentInput } from "@/features/jobCards/types";

export default function NewJobCardPage() {
  const t = useTranslations("jobCards");
  const router = useRouter();
  const [create, { isLoading }] = useCreateJobCardMutation();
  const { data: owners = [] } = useGetOwnersQuery();
  const { data: vehicles = [] } = useGetVehiclesQuery();
  const [createOwner, { isLoading: creatingOwner }] = useCreateOwnerMutation();
  const [createVehicle, { isLoading: creatingVehicle }] = useCreateVehicleMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<JobCardCreateFormData>({
    resolver: zodResolver(jobCardCreateSchema),
    defaultValues: {
      private_paint: false,
      private_mechanic: false,
      insurance_provider: "",
      remarks: "",
      requested_materials: "",
      conditions: [],
      staff_assignments: [],
    },
  });

  const ownerId = watch("owner_id");
  const vehicleId = watch("vehicle_id");
  const conditions = watch("conditions");
  const staffAssignments = watch("staff_assignments");

  const [showNewOwner, setShowNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");

  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicleModel, setNewVehicleModel] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("");
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleEngine, setNewVehicleEngine] = useState("");
  const [newVehicleChassis, setNewVehicleChassis] = useState("");

  const ownerVehicles = vehicles.filter((v) => v.owner_id === ownerId);

  const ownerOptions = owners.map((o) => ({
    value: o.id,
    label: o.name,
    subtitle: o.phone,
  }));

  const vehicleOptions = ownerVehicles.map((v) => ({
    value: v.id,
    label: `${v.model} — ${v.plate_number}`,
    subtitle: v.type,
  }));

  const handleCreateOwner = useCallback(async () => {
    if (!newOwnerName.trim() || !newOwnerPhone.trim()) return;
    try {
      const owner = await createOwner({
        name: newOwnerName.trim(),
        phone: newOwnerPhone.trim(),
      }).unwrap();
      setValue("owner_id", owner.id, { shouldValidate: true });
      setValue("vehicle_id", "", { shouldValidate: true });
      setShowNewOwner(false);
      setNewOwnerName("");
      setNewOwnerPhone("");
    } catch {
      setError("root", { message: "Failed to create owner" });
    }
  }, [newOwnerName, newOwnerPhone, createOwner, setValue, setError]);

  const handleCreateVehicle = useCallback(async () => {
    if (!newVehicleModel.trim() || !newVehiclePlate.trim()) return;
    try {
      const vehicle = await createVehicle({
        owner_id: ownerId,
        model: newVehicleModel.trim(),
        type: newVehicleType.trim() || "Other",
        plate_number: newVehiclePlate.trim(),
        engine_number: newVehicleEngine.trim() || "—",
        chassis_number: newVehicleChassis.trim() || "—",
      }).unwrap();
      setValue("vehicle_id", vehicle.id, { shouldValidate: true });
      setShowNewVehicle(false);
      setNewVehicleModel("");
      setNewVehicleType("");
      setNewVehiclePlate("");
      setNewVehicleEngine("");
      setNewVehicleChassis("");
    } catch {
      setError("root", { message: "Failed to create vehicle" });
    }
  }, [newVehicleModel, newVehicleType, newVehiclePlate, newVehicleEngine, newVehicleChassis, ownerId, createVehicle, setValue, setError]);

  const onSubmit = async (data: JobCardCreateFormData) => {
    try {
      await create({
        vehicle_id: data.vehicle_id,
        owner_id: data.owner_id,
        mileage_km: data.mileage_km,
        private_paint: data.private_paint,
        private_mechanic: data.private_mechanic,
        insurance_provider: data.insurance_provider || null,
        description: data.description,
        remarks: data.remarks || null,
        requested_materials: data.requested_materials || null,
        conditions: data.conditions.filter((c) => c.condition_state !== "available"),
        staff_assignments: data.staff_assignments.filter((a) => a.employee_id && a.role),
      }).unwrap();
      router.push("/job-cards");
    } catch {
      setError("root", { message: "Failed to create job card" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Button variant="ghost" onClick={() => router.push("/job-cards")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Job Cards
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Owner + Vehicle */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold">Owner & Vehicle</h2>

          <div className="space-y-2">
            <Label>{t("owner")}</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  options={ownerOptions}
                  value={ownerId}
                  onSelect={(val) => {
                    setValue("owner_id", val, { shouldValidate: true });
                    setValue("vehicle_id", "", { shouldValidate: true });
                  }}
                  placeholder="Select owner..."
                  searchPlaceholder="Search owners..."
                  emptyText="No owners found."
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowNewOwner(true)}
                title="New Owner"
              >
                <Plus size={15} />
              </Button>
            </div>
            {errors.owner_id && <p className="text-sm text-destructive">{errors.owner_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("vehicle")}</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  options={vehicleOptions}
                  value={vehicleId}
                  onSelect={(val) => setValue("vehicle_id", val, { shouldValidate: true })}
                  placeholder={ownerId ? "Select vehicle..." : "Select owner first"}
                  searchPlaceholder="Search vehicles..."
                  emptyText="No vehicles for this owner."
                  disabled={!ownerId}
                />
              </div>
              {ownerId && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewVehicle(true)}
                  title="New Vehicle"
                >
                  <Plus size={15} />
                </Button>
              )}
            </div>
            {errors.vehicle_id && <p className="text-sm text-destructive">{errors.vehicle_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">{t("mileage")}</Label>
            <input id="mileage" type="number" {...register("mileage_km", { valueAsNumber: true })}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            {errors.mileage_km && <p className="text-sm text-destructive">{errors.mileage_km.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea id="description" rows={3} {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input id="pp" type="checkbox" {...register("private_paint")}
              className="h-4 w-4 rounded border-input text-indigo-500 focus:ring-indigo-500" />
            <Label htmlFor="pp">{t("privatePaint")}</Label>
          </div>

          <div className="flex items-center gap-2">
            <input id="pm" type="checkbox" {...register("private_mechanic")}
              className="h-4 w-4 rounded border-input text-indigo-500 focus:ring-indigo-500" />
            <Label htmlFor="pm">{t("privateMechanic")}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ins">{t("insuranceProvider")}</Label>
            <input id="ins" {...register("insurance_provider")}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rem">{t("remarks")}</Label>
            <Textarea id="rem" rows={2} {...register("remarks")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mat">{t("requestedMaterials")}</Label>
            <Textarea id="mat" rows={2} {...register("requested_materials")} />
          </div>
        </div>

        {/* Conditions */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">{t("conditions")}</h2>
          <ConditionWizard
            conditions={conditions}
            onChange={(val: VehicleConditionInput[]) => setValue("conditions", val, { shouldValidate: true })}
          />
        </div>

        {/* Mechanics */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">{t("mechanics")}</h2>
          <MechanicAssign
            value={staffAssignments}
            onChange={(val: StaffAssignmentInput[]) => setValue("staff_assignments", val, { shouldValidate: true })}
          />
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        {/* Inline submit */}
        <div className="hidden md:block">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? "Creating..." : t("create")}
          </Button>
        </div>

        {/* Sticky submit bar (mobile) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">New job card</span>
            <Button type="submit" disabled={isLoading} className="min-w-32">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Creating..." : t("create")}
            </Button>
          </div>
        </div>
      </form>

      {/* New Owner Dialog */}
      <Dialog open={showNewOwner} onOpenChange={setShowNewOwner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Owner</DialogTitle>
            <DialogDescription>Add a new vehicle owner to the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="no_name">Name</Label>
              <input id="no_name" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="no_phone">Phone</Label>
              <input id="no_phone" value={newOwnerPhone} onChange={(e) => setNewOwnerPhone(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOwner(false)}>Cancel</Button>
            <Button onClick={handleCreateOwner} disabled={creatingOwner || !newOwnerName.trim() || !newOwnerPhone.trim()}>
              {creatingOwner && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Vehicle Dialog */}
      <Dialog open={showNewVehicle} onOpenChange={setShowNewVehicle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Vehicle</DialogTitle>
            <DialogDescription>Add a new vehicle for the selected owner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nv_model">Model</Label>
              <input id="nv_model" value={newVehicleModel} onChange={(e) => setNewVehicleModel(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nv_type">Type</Label>
                <input id="nv_type" value={newVehicleType} onChange={(e) => setNewVehicleType(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nv_plate">Plate</Label>
                <input id="nv_plate" value={newVehiclePlate} onChange={(e) => setNewVehiclePlate(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nv_engine">Engine #</Label>
                <input id="nv_engine" value={newVehicleEngine} onChange={(e) => setNewVehicleEngine(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nv_chassis">Chassis #</Label>
                <input id="nv_chassis" value={newVehicleChassis} onChange={(e) => setNewVehicleChassis(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewVehicle(false)}>Cancel</Button>
            <Button onClick={handleCreateVehicle} disabled={creatingVehicle || !newVehicleModel.trim() || !newVehiclePlate.trim()}>
              {creatingVehicle && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
