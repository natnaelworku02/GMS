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
import { PerformaLineItems } from "@/features/performas/components/PerformaLineItems";
import { PerformaSummary } from "@/features/performas/components/PerformaSummary";
import { useCreatePerformaMutation } from "@/features/performas/api";
import { jobCardCreateSchema, type JobCardCreateFormData } from "@/lib/formSchemas";
import { PART_SECTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Check, ChevronLeft, ChevronRight, Plus, User, Truck, Wrench, ClipboardCheck, Receipt } from "lucide-react";
import type { VehicleConditionInput } from "@/features/jobCards/types";
import type { LineItemInput } from "@/features/performas/types";

const CONDITION_STEP_START = 2;

export default function StartJobPage() {
  const t = useTranslations("startJob");
  const STEPS = [
    { label: t("stepOwnerLabel"), icon: User },
    { label: t("stepVehicleLabel"), icon: Truck },
    ...PART_SECTIONS.map((s) => ({ label: s.sectionLabel, icon: Wrench })),
    { label: t("stepStaffLabel"), icon: User },
    { label: t("stepReviewLabel"), icon: ClipboardCheck },
    { label: t("stepPerformaLabel"), icon: Receipt },
  ];
  const tc = useTranslations("common");
  const router = useRouter();
  const [createJobCard, { isLoading: isCreatingJobCard }] = useCreateJobCardMutation();
  const [createPerforma, { isLoading: isCreatingPerforma }] = useCreatePerformaMutation();
  const { data: ownersResp } = useGetOwnersQuery({ page: 1, page_size: 100 });
  const owners = ownersResp?.items ?? [];
  const { data: vehiclesResp } = useGetVehiclesQuery({ page: 1, page_size: 100 });
  const vehicles = vehiclesResp?.items ?? [];
  const [createOwner, { isLoading: creatingOwner }] = useCreateOwnerMutation();
  const [createVehicle, { isLoading: creatingVehicle }] = useCreateVehicleMutation();

  const [step, setStep] = useState(0);
  const [cwStep, setCwStep] = useState(0);
  const [createdJobCardId, setCreatedJobCardId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    trigger,
    formState: { errors },
  } = useForm<JobCardCreateFormData>({
    resolver: zodResolver(jobCardCreateSchema),
    defaultValues: {
      mileage_km: 0,
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

  const [lineItems, setLineItems] = useState<LineItemInput[]>([{ type: "labor", description: "", quantity: 1, unit_price: 0 }]);
  const [clientEmail, setClientEmail] = useState("");

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

  const totalSteps = STEPS.length;

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
  }, [newOwnerName, newOwnerPhone, createOwner, setValue, setError, t]);

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
  }, [newVehicleModel, newVehicleType, newVehiclePlate, newVehicleEngine, newVehicleChassis, ownerId, createVehicle, setValue, setError, t]);

  const handleCreateJobCard = async (data: JobCardCreateFormData) => {
    try {
      const jc = await createJobCard({
        vehicle_id: data.vehicle_id,
        owner_id: data.owner_id,
        mileage_km: data.mileage_km ?? 0,
        private_paint: data.private_paint,
        private_mechanic: data.private_mechanic,
        insurance_provider: data.insurance_provider || null,
        description: data.description,
        remarks: data.remarks || null,
        requested_materials: data.requested_materials || null,
        conditions: data.conditions.filter((c) => c.condition_state !== "available"),
        mechanic_ids: data.mechanic_ids,
      }).unwrap();
      setCreatedJobCardId(jc.id);
      setStep(totalSteps - 1);
    } catch {
      toast.error(t("createJobCardError"));
    }
  };

  const handleCreatePerforma = useCallback(async () => {
    if (!createdJobCardId) return;
    if (!lineItems.some((li) => li.description.trim())) {
      toast.error(t("lineItemRequired"));
      return;
    }
    try {
      await createPerforma({
        job_card_id: createdJobCardId,
        client_email: clientEmail || undefined,
        line_items: lineItems.map((li) => ({ ...li, description: li.description.trim() })),
      }).unwrap();
      router.push(`/job-cards/${createdJobCardId}`);
    } catch {
      toast.error(t("createPerformaError"));
    }
  }, [createdJobCardId, lineItems, createPerforma, clientEmail, router, t]);

  const canGoNext = () => true;

  const handleNext = async () => {
    let valid = true;
    if (step === 0) {
      valid = await trigger("owner_id");
    } else if (step === 1) {
      valid = await trigger(["vehicle_id", "mileage_km", "description"]);
    }
    if (!valid) return;
    if (step >= CONDITION_STEP_START && step < CONDITION_STEP_START + PART_SECTIONS.length - 1) {
      setCwStep(cwStep + 1);
    }
    if (step < totalSteps - 2) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > CONDITION_STEP_START && step <= CONDITION_STEP_START + PART_SECTIONS.length - 1) {
      setCwStep(cwStep - 1);
    }
    if (step > 0) setStep(step - 1);
  };

  const isConditionStep = step >= CONDITION_STEP_START && step < CONDITION_STEP_START + PART_SECTIONS.length;
  const isReviewStep = step === totalSteps - 2;
  const isPerformaStep = step === totalSteps - 1;

  const totalDamaged = conditions.filter((c) => c.condition_state !== "available").length;

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const vatRate = 15;
  const vatAmount = subtotal * (vatRate / 100);
  const grandTotal = subtotal + vatAmount;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>

      {/* Step indicator */}
      {!isPerformaStep && (
        <>
          <div className="mb-8 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {STEPS.slice(0, -1).map((s, i) => (
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
                  {i < STEPS.length - 2 && (
                    <div className={cn("h-0.5 w-4 rounded-full", i < step ? "bg-emerald-400" : "bg-muted")} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mb-6 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-500"
              style={{ width: `${((step + 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </>
      )}

      <form id="job-card-form" onSubmit={handleSubmit(handleCreateJobCard)}>
        {/* Step 0: Owner */}
        {step === 0 && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold">{t("step", { step: 1 })} — {t("owner")}</h2>
            <p className="text-xs text-muted-foreground">{t("selectOwner")}</p>

            <div className="space-y-2">
              <Label>{t("owner")}</Label>
              <Combobox
                options={ownerOptions}
                value={ownerId}
                onSelect={(val) => {
                  setValue("owner_id", val, { shouldValidate: true });
                  setValue("vehicle_id", "", { shouldValidate: true });
                }}
                placeholder={tc("search")}
                searchPlaceholder={t("searchPlaceholder")}
                emptyText={tc("noResults")}
              />
              {errors.owner_id && <p className="text-sm text-destructive">{errors.owner_id.message}</p>}
            </div>

            {showNewOwner ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-indigo-600">{t("newOwner")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("name")}</Label>
                    <Input value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("phone")}</Label>
                    <Input value={newOwnerPhone} onChange={(e) => setNewOwnerPhone(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewOwner(false)}>{tc("cancel")}</Button>
                  <Button type="button" size="sm" onClick={handleCreateOwner}
                    disabled={creatingOwner || !newOwnerName.trim() || !newOwnerPhone.trim()}>
                    {creatingOwner && <Loader2 className="h-3 w-3 animate-spin" />}
                    {t("newOwner")}
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

        {/* Step 1: Vehicle + Details */}
        {step === 1 && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold">{t("step", { step: 2 })} — {t("vehicle")}</h2>
            <p className="text-xs text-muted-foreground">{t("selectVehicle", { name: owners.find((o) => o.id === ownerId)?.name || "" })}</p>

            <div className="space-y-2">
              <Label>{t("vehicle")}</Label>
              <Combobox
                options={vehicleOptions}
                value={vehicleId}
                onSelect={(val) => setValue("vehicle_id", val, { shouldValidate: true })}
                placeholder={ownerId ? t("vehiclePlaceholder") : t("ownerFirstPlaceholder")}
                searchPlaceholder={t("vehicleSearchPlaceholder")}
                emptyText={t("noVehiclesForOwner")}
                disabled={!ownerId}
              />
              {errors.vehicle_id && <p className="text-sm text-destructive">{errors.vehicle_id.message}</p>}
            </div>

            {showNewVehicle ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-indigo-600">{t("newVehicle")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("model")}</Label>
                    <Input value={newVehicleModel} onChange={(e) => setNewVehicleModel(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("type")}</Label>
                    <Input value={newVehicleType} onChange={(e) => setNewVehicleType(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("plateNumber")}</Label>
                    <Input value={newVehiclePlate} onChange={(e) => setNewVehiclePlate(e.target.value)} className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("engineNumber")}</Label>
                    <Input value={newVehicleEngine} onChange={(e) => setNewVehicleEngine(e.target.value)} className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("chassisNumber")}</Label>
                    <Input value={newVehicleChassis} onChange={(e) => setNewVehicleChassis(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewVehicle(false)}>{tc("cancel")}</Button>
                  <Button type="button" size="sm" onClick={handleCreateVehicle}
                    disabled={creatingVehicle || !newVehicleModel.trim() || !newVehiclePlate.trim()}>
                    {creatingVehicle && <Loader2 className="h-3 w-3 animate-spin" />}
                    {t("newVehicle")}
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
                <Input id="mileage" type="number" {...register("mileage_km", { valueAsNumber: true })} />
                {errors.mileage_km && <p className="text-sm text-destructive">{errors.mileage_km.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ins">{t("insuranceProvider")}</Label>
                <Input id="ins" {...register("insurance_provider")} />
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

        {/* Steps 2-8: Condition Wizard */}
        {isConditionStep && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">{t("step", { step: step + 1 })} — {t("condition")}</h2>
            <ConditionWizard
              conditions={conditions}
              onChange={(val: VehicleConditionInput[]) => setValue("conditions", val, { shouldValidate: true })}
              showStepIndicator={false}
              step={cwStep}
              onStepChange={setCwStep}
            />
          </div>
        )}

        {/* Step 9: Staff */}
        {step === CONDITION_STEP_START + PART_SECTIONS.length && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("step", { step: step + 1 })} — {t("staff")}</h2>
            <p className="text-xs text-muted-foreground">{t("staffDescription")}</p>
            <MechanicAssign
              value={mechanicIds || []}
              onChange={(val: string[]) => setValue("mechanic_ids", val, { shouldValidate: true })}
            />
          </div>
        )}

        {/* Step 10: Review & Submit Job Card */}
        {isReviewStep && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold">{t("step", { step: step + 1 })} — {t("review")}</h2>
            <p className="text-xs text-muted-foreground">{t("reviewDescription")}</p>

            {Object.keys(errors).length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-1">
                <p className="text-xs font-medium text-destructive">Please fix the following errors:</p>
                <ul className="list-disc list-inside text-xs text-destructive/80 space-y-0.5">
                  {Object.entries(errors).map(([key, err]) => (
                    <li key={key}>{(err as { message?: string })?.message || key}</li>
                  ))}
                </ul>
              </div>
            )}

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
      </form>

      {/* Step 11: Performa */}
      {isPerformaStep && (
        <div className="space-y-6">
          {createdJobCardId && (
            <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/30 p-4">
              <p className="text-sm text-emerald-600 font-medium">{t("jobCardCreated")}</p>
            </div>
          )}

          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("step", { step: totalSteps })} — {t("performa")}</h2>
            <p className="text-xs text-muted-foreground">{t("performaDescription")}</p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("clientEmail")}</h2>
            <Input
              type="email"
              placeholder={t("clientEmailPlaceholder")}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("lineItems")}</h2>
            <PerformaLineItems items={lineItems} onChange={setLineItems} />
            <PerformaSummary subtotal={subtotal} vatRate={vatRate} vatAmount={vatAmount} grandTotal={grandTotal} />
          </div>

          <div className="hidden md:flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(totalSteps - 2)}>
              <ChevronLeft size={15} />
              {t("previous")}
            </Button>
            <Button
              type="button"
              onClick={handleCreatePerforma}
              disabled={isCreatingPerforma}
            >
              {isCreatingPerforma && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCreatingPerforma ? t("creatingPerforma") : t("createPerforma")}
            </Button>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(totalSteps - 2)}>
                <ChevronLeft size={15} />
                {t("previous")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreatePerforma}
                disabled={isCreatingPerforma}
              >
                {isCreatingPerforma && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCreatingPerforma ? t("creatingPerforma") : t("createPerforma")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation (steps 0-10) */}
      {!isPerformaStep && (
        <div className="mt-6 hidden md:flex items-center justify-between">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={handlePrev}>
                <ChevronLeft size={15} />
                {t("previous")}
              </Button>
            )}
          </div>
          <div>
            {!isReviewStep ? (
              <Button type="button" onClick={handleNext} disabled={!canGoNext()}>
                {t("next")}
                <ChevronRight size={15} />
              </Button>
            ) : (
              <Button type="submit" form="job-card-form" disabled={isCreatingJobCard}>
                {isCreatingJobCard && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCreatingJobCard ? t("creatingJobCard") : t("createJobCard")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile navigation bar (steps 0-10) */}
      {!isPerformaStep && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              {step > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={handlePrev}>
                  <ChevronLeft size={15} />
                  {t("previous")}
                </Button>
              )}
            </div>
            <div>
              {!isReviewStep ? (
                <Button type="button" size="sm" onClick={handleNext} disabled={!canGoNext()}>
                  {t("next")}
                  <ChevronRight size={15} />
                </Button>
              ) : (
                <Button type="submit" form="job-card-form" size="sm" disabled={isCreatingJobCard}>
                  {isCreatingJobCard && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCreatingJobCard ? t("creatingJobCard") : t("createJobCard")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
