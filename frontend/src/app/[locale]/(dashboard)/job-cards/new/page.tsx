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
import { PART_SECTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Check, ChevronLeft, ChevronRight, Plus, User, Truck, Wrench, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import type { VehicleConditionInput } from "@/features/jobCards/types";

const CONDITION_STEP_START = 2;

export default function NewJobCardPage() {
  const t = useTranslations("jobCards");
  const tc = useTranslations("common");

  const OUTER_STEPS = [
    { label: t("owner"), icon: User },
    { label: t("vehicle"), icon: Truck },
    ...PART_SECTIONS.map((s) => ({ label: s.sectionLabel, icon: Wrench })),
    { label: t("staffSummary"), icon: User },
    { label: t("review"), icon: ClipboardCheck },
  ];
  const router = useRouter();
  const [create, { isLoading }] = useCreateJobCardMutation();
  const { data: owners = [] } = useGetOwnersQuery();
  const { data: vehicles = [] } = useGetVehiclesQuery();
  const [createOwner, { isLoading: creatingOwner }] = useCreateOwnerMutation();
  const [createVehicle, { isLoading: creatingVehicle }] = useCreateVehicleMutation();

  const [step, setStep] = useState(0);
  const [cwStep, setCwStep] = useState(0);

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
      mechanic_ids: [],
    },
  });

  const ownerId = watch("owner_id");
  const vehicleId = watch("vehicle_id");
  const conditions = watch("conditions");
  const mechanicIds = watch("mechanic_ids");

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

  const totalSteps = OUTER_STEPS.length;

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
      toast.error(t("createOwnerError"));
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
      toast.error(t("createVehicleError"));
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
        mechanic_ids: data.mechanic_ids,
      }).unwrap();
      router.push("/job-cards");
    } catch {
      toast.error(t("createJobCardError"));
    }
  };

  const canGoNext = () => {
    if (step === 0) return !!ownerId;
    if (step === 1) return !!vehicleId;
    return true;
  };

  const handleNext = () => {
    if (step >= CONDITION_STEP_START && step < CONDITION_STEP_START + PART_SECTIONS.length - 1) {
      setCwStep(cwStep + 1);
    }
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > CONDITION_STEP_START && step <= CONDITION_STEP_START + PART_SECTIONS.length - 1) {
      setCwStep(cwStep - 1);
    }
    if (step > 0) setStep(step - 1);
  };

  const isConditionStep = step >= CONDITION_STEP_START && step < CONDITION_STEP_START + PART_SECTIONS.length;
  const isLastStep = step === totalSteps - 1;

  const totalDamaged = conditions.filter((c) => c.condition_state !== "available").length;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Button variant="ghost" onClick={() => router.push("/job-cards")} className="mb-4">
        <ArrowLeft size={15} />
        {t("backToList")}
      </Button>

      {/* Unified Step Indicator */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {OUTER_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (i < step) {
                    if (i >= CONDITION_STEP_START && i < CONDITION_STEP_START + PART_SECTIONS.length) {
                      setCwStep(i - CONDITION_STEP_START);
                    }
                    setStep(i);
                  }
                }}
                disabled={i > step}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  i === step
                    ? "bg-indigo-500 text-white shadow-sm"
                    : i < step
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  i === step
                    ? "bg-white/20 text-white"
                    : i < step
                      ? "bg-emerald-500 text-white"
                      : "bg-muted-foreground/20 text-muted-foreground",
                )}>
                  {i < step ? <Check size={10} /> : i + 1}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{s.label}</span>
              </button>
              {i < totalSteps - 1 && (
                <div className={cn("h-0.5 w-4 rounded-full", i < step ? "bg-emerald-400" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-500"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <form id="job-card-form" onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Owner */}
        {step === 0 && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold">{t("step1Heading")}</h2>
            <p className="text-xs text-muted-foreground">{t("selectOwnerDesc")}</p>

            <div className="space-y-2">
              <Label>{t("owner")}</Label>
              <Combobox
                options={ownerOptions}
                value={ownerId}
                onSelect={(val) => {
                  setValue("owner_id", val, { shouldValidate: true });
                  setValue("vehicle_id", "", { shouldValidate: true });
                }}
                placeholder={t("selectOwner")}
                searchPlaceholder={t("searchOwner")}
                emptyText={t("noOwnersFound")}
              />
              {errors.owner_id && <p className="text-sm text-destructive">{errors.owner_id.message}</p>}
            </div>

            {/* Inline New Owner Form */}
            {showNewOwner ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-indigo-600">{t("newOwner")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("name")}</Label>
                    <input value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("phone")}</Label>
                    <input value={newOwnerPhone} onChange={(e) => setNewOwnerPhone(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewOwner(false)}>{tc("cancel")}</Button>
                  <Button type="button" size="sm" onClick={handleCreateOwner}
                    disabled={creatingOwner || !newOwnerName.trim() || !newOwnerPhone.trim()}>
                    {creatingOwner && <Loader2 className="h-3 w-3 animate-spin" />}
                    {t("createOwner")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewOwner(true)}>
                <Plus size={14} />
                {t("newOwner")}
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Vehicle */}
        {step === 1 && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold">{t("step2Heading")}</h2>
            <p className="text-xs text-muted-foreground">{t("selectVehicleDesc", { name: owners.find((o) => o.id === ownerId)?.name || "" })}</p>

            <div className="space-y-2">
              <Label>{t("vehicle")}</Label>
              <Combobox
                options={vehicleOptions}
                value={vehicleId}
                onSelect={(val) => setValue("vehicle_id", val, { shouldValidate: true })}
                placeholder={ownerId ? t("selectVehicle") : t("selectOwnerFirst")}
                searchPlaceholder={t("searchVehicle")}
                emptyText={t("noVehiclesForOwner")}
                disabled={!ownerId}
              />
              {errors.vehicle_id && <p className="text-sm text-destructive">{errors.vehicle_id.message}</p>}
            </div>

            {/* Inline New Vehicle Form */}
            {showNewVehicle ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-indigo-600">{t("newVehicle")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("model")}</Label>
                    <input value={newVehicleModel} onChange={(e) => setNewVehicleModel(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("type")}</Label>
                    <input value={newVehicleType} onChange={(e) => setNewVehicleType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("labelPlateNumber")}</Label>
                    <input value={newVehiclePlate} onChange={(e) => setNewVehiclePlate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("labelEngineNumber")}</Label>
                    <input value={newVehicleEngine} onChange={(e) => setNewVehicleEngine(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("labelChassisNumber")}</Label>
                    <input value={newVehicleChassis} onChange={(e) => setNewVehicleChassis(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewVehicle(false)}>{tc("cancel")}</Button>
                  <Button type="button" size="sm" onClick={handleCreateVehicle}
                    disabled={creatingVehicle || !newVehicleModel.trim() || !newVehiclePlate.trim()}>
                    {creatingVehicle && <Loader2 className="h-3 w-3 animate-spin" />}
                    {t("createVehicle")}
                  </Button>
                </div>
              </div>
            ) : (
              ownerId && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewVehicle(true)}>
                  <Plus size={14} />
                  {t("newVehicle")}
                </Button>
              )
            )}

            <hr className="border-border" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mileage">{t("mileage")}</Label>
                <input id="mileage" type="number" {...register("mileage_km", { valueAsNumber: true })}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                {errors.mileage_km && <p className="text-sm text-destructive">{errors.mileage_km.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ins">{t("insuranceProvider")}</Label>
                <input id="ins" {...register("insurance_provider")}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" rows={2} {...register("description")} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("private_paint")}
                  className="h-4 w-4 rounded border-input text-indigo-500 focus:ring-indigo-500" />
                {t("privatePaint")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("private_mechanic")}
                  className="h-4 w-4 rounded border-input text-indigo-500 focus:ring-indigo-500" />
                {t("privateMechanic")}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rem">{t("remarks")}</Label>
                <Textarea id="rem" rows={2} {...register("remarks")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat">{t("requestedMaterials")}</Label>
                <Textarea id="mat" rows={2} {...register("requested_materials")} />
              </div>
            </div>
          </div>
        )}

        {/* Steps 3-9: Condition Wizard (embedded) */}
        {isConditionStep && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <ConditionWizard
              conditions={conditions}
              onChange={(val: VehicleConditionInput[]) => setValue("conditions", val, { shouldValidate: true })}
              showStepIndicator={false}
              step={cwStep}
              onStepChange={setCwStep}
            />
          </div>
        )}

        {/* Step 10: Staff Assignments */}
        {step === CONDITION_STEP_START + PART_SECTIONS.length && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("stepStaffHeading", { step: CONDITION_STEP_START + PART_SECTIONS.length + 1 })}</h2>
            <p className="text-xs text-muted-foreground">{t("staffAssignDesc")}</p>
            <MechanicAssign
              value={mechanicIds || []}
              onChange={(val: string[]) => setValue("mechanic_ids", val, { shouldValidate: true })}
            />
          </div>
        )}

        {/* Step 11: Review & Submit */}
        {isLastStep && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold">{t("stepReviewHeading", { step: totalSteps })}</h2>
            <p className="text-xs text-muted-foreground">{t("reviewDesc")}</p>

            {/* Owner Summary */}
            {ownerId && (() => {
              const owner = owners.find((o) => o.id === ownerId);
              return owner ? (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("ownerSummary")}</p>
                  <p className="text-sm font-medium">{owner.name}</p>
                  <p className="text-xs text-muted-foreground">{owner.phone}</p>
                </div>
              ) : null;
            })()}

            {/* Vehicle Summary */}
            {vehicleId && (() => {
              const vehicle = vehicles.find((v) => v.id === vehicleId);
              return vehicle ? (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("vehicleSummary")}</p>
                  <p className="text-sm font-medium">{vehicle.model}</p>
                  <p className="text-xs text-muted-foreground">{vehicle.plate_number} · {vehicle.type}</p>
                </div>
              ) : null;
            })()}

            {/* Damage Summary */}
            {totalDamaged > 0 ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("damageSummary")}</p>
                <p className="text-sm">{t("partsWithIssues", { count: totalDamaged })}</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("damageSummary")}</p>
                <p className="text-sm text-emerald-600">{t("allPartsAvailable")}</p>
              </div>
            )}

            {/* Staff Summary */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t("staffSummary")}</p>
              {mechanicIds && mechanicIds.length > 0 ? (
                <p className="text-sm">{t("staffCount", { count: mechanicIds.length })}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noStaffAssigned")}</p>
              )}
            </div>

          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={handlePrev}>
                <ChevronLeft size={15} />
                {t("previous")}
              </Button>
            )}
          </div>
          <div>
            {!isLastStep ? (
              <Button type="button" onClick={handleNext} disabled={!canGoNext()}>
                {t("next")}
                <ChevronRight size={15} />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? t("creating") : t("create")}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Sticky submit bar (mobile) */}
      {isLastStep && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{t("reviewJobCard")}</span>
            <Button type="submit" form="job-card-form" disabled={isLoading} className="min-w-32">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? t("creating") : t("create")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
