"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreatePerformaMutation } from "@/features/performas/api";
import { useGetJobCardsQuery, useGetJobCardQuery, useGetVehicleQuery } from "@/features/jobCards/api";
import { useGetInventoryItemsQuery } from "@/features/inventory/api";
import { PerformaLineItems } from "@/features/performas/components/PerformaLineItems";
import { PerformaSummary } from "@/features/performas/components/PerformaSummary";
import { performaCreateSchema, type PerformaCreateFormData } from "@/lib/formSchemas";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import type { LineItemInput } from "@/features/performas/types";

const CONDITION_LABELS: Record<string, string> = {
  available: "Available",
  damaged: "Damaged",
  not_available: "Not Available",
  scratch: "Scratched",
  broken: "Broken",
  crack: "Cracked",
  dent: "Dented",
  bend: "Bent",
};

const PART_NAME_LABELS: Record<string, string> = {
  trunk: "Trunk",
  lh_body: "Left Body",
  rh_body: "Right Body",
  interior: "Interior",
  front_body: "Front Body",
  peripheral: "Peripheral",
};

export default function NewPerformaPage({ searchParams }: { searchParams: Promise<{ job_card_id?: string }> }) {
  const [params, setParams] = useState<{ job_card_id?: string }>({});
  useEffect(() => { searchParams.then(setParams); }, [searchParams]);

  const t = useTranslations("performas");
  const tc = useTranslations("common");
  const router = useRouter();
  const jobCardIdFromUrl = params.job_card_id || "";
  const [create, { isLoading }] = useCreatePerformaMutation();

  const [jobCardId, setJobCardId] = useState(jobCardIdFromUrl);
  const [showDamaged, setShowDamaged] = useState(true);
  const { data: jobCard } = useGetJobCardQuery(jobCardId, { skip: !jobCardId });
  const { data: vehicle } = useGetVehicleQuery(jobCard?.vehicle_id || "", { skip: !jobCard?.vehicle_id });
  const { data: jobCardsResp } = useGetJobCardsQuery({ page: 1, page_size: 100 });
  const { data: inventoryResp } = useGetInventoryItemsQuery({ page: 1, page_size: 100, vehicle_type: vehicle?.type });
  const jobCards = jobCardsResp?.items ?? [];
  const inventoryItems = inventoryResp?.items ?? [];

  const [lineItems, setLineItems] = useState<LineItemInput[]>([{ type: "labor", description: "", quantity: 1, unit_price: 0 }]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<PerformaCreateFormData>({
    resolver: zodResolver(performaCreateSchema),
    defaultValues: { job_card_id: jobCardIdFromUrl, client_email: "", line_items: lineItems } as any,
  });

  const handleLineItemsChange = useCallback(
    (items: LineItemInput[]) => {
      setLineItems(items);
      setValue("line_items" as any, items, { shouldValidate: false });
    },
    [setValue],
  );

  const damagedConditions = (jobCard?.conditions ?? []).filter((c) => c.condition_state !== "available");

  const addConditionAsLineItem = (partName: string) => {
    const label = PART_NAME_LABELS[partName] || partName;
    const newItem: LineItemInput = { type: "labor", description: `Repair ${label}`, quantity: 1, unit_price: 0 };
    const updated = [...lineItems, newItem];
    setLineItems(updated);
    setValue("line_items" as any, updated, { shouldValidate: false });
  };

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const vatRate = 15;
  const vatAmount = subtotal * (vatRate / 100);
  const grandTotal = subtotal + vatAmount;

  const onSubmit = async (data: PerformaCreateFormData) => {
    if (!lineItems.some((li) => li.description.trim())) {
      toast.error(t("lineItemRequired"));
      return;
    }
    try {
      const perf = await create({
        job_card_id: jobCardId,
        client_email: data.client_email || undefined,
        line_items: lineItems.map((li) => ({ ...li, description: li.description.trim() })),
      }).unwrap();
      toast.success(tc("updated"));
      router.push(`/performas/${perf.id}`);
    } catch {
      toast.error(tc("error"));
    }
  };

  const jobCardOptions = jobCards.map((jc) => ({
    value: jc.id,
    label: `${jc.description.slice(0, 50)}${jc.description.length > 50 ? "…" : ""}`,
    subtitle: jc.status,
  }));

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <Button variant="ghost" onClick={() => router.push("/performas")} className="mb-6">
        <ArrowLeft size={15} />
        {tc("back")} {t("title")}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* ===== Left Column ===== */}
        <div className="space-y-6 min-w-0">
          {/* Job Card Selection */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("jobCard")}</h2>
            <div className="space-y-2">
              <Label>{t("jobCardId")}</Label>
              <Combobox
                options={jobCardOptions}
                value={jobCardId}
                onSelect={(val) => {
                  setJobCardId(val);
                  setValue("job_card_id", val);
                }}
                placeholder={t("selectJobCard") || "Select a job card..."}
                searchPlaceholder={tc("search") + "..."}
                emptyText={tc("noResults")}
              />
              {jobCard && vehicle && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {vehicle.model} — {vehicle.plate_number}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {vehicle.type}
                  </Badge>
                  {jobCard.status && (
                    <Badge variant="secondary" className="text-xs">
                      {jobCard.status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Damaged Conditions — mobile only (collapsible inline) */}
          {damagedConditions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm lg:hidden">
              <button
                type="button"
                onClick={() => setShowDamaged(!showDamaged)}
                className="flex w-full items-center justify-between p-4 text-sm font-semibold text-amber-700"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} />
                  {t("damagedItems") || "Damaged items from inspection"} ({damagedConditions.length})
                </div>
                <svg
                  className={`h-4 w-4 transition-transform ${showDamaged ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showDamaged && (
                <div className="border-t border-amber-200/50 divide-y divide-amber-200/50">
                  {damagedConditions.map((cond) => (
                    <div key={cond.id || cond.part_name} className="flex items-center justify-between px-4 py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-amber-800">
                          {PART_NAME_LABELS[cond.part_name] || cond.part_name}
                        </span>
                        <span className="rounded-full bg-amber-200/60 px-2 py-0.5 text-xs text-amber-700">
                          {CONDITION_LABELS[cond.condition_state] || cond.condition_state}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addConditionAsLineItem(cond.part_name)}
                        className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                      >
                        <Plus size={12} className="mr-1" />
                        {t("addToLineItems") || "Add"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Client Email */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("detail")}</h2>
            <div className="space-y-2">
              <Label htmlFor="email">{t("clientEmail")}</Label>
              <Input id="email" type="email" placeholder={t("clientEmailPlaceholder")} {...register("client_email")} />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">{t("lineItems")}</h2>
              <PerformaLineItems
                items={lineItems}
                onChange={handleLineItemsChange}
                inventoryItems={inventoryItems}
              />
            {errors.line_items && <p className="text-sm text-destructive">{errors.line_items.message}</p>}
            <PerformaSummary subtotal={subtotal} vatRate={vatRate} vatAmount={vatAmount} grandTotal={grandTotal} />
          </div>

          <div className="hidden lg:block">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("create")}
            </Button>
          </div>
        </div>

        {/* ===== Right Sidebar (desktop only) ===== */}
        <div className="hidden lg:block space-y-6">
          {damagedConditions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm sticky top-6">
              <div className="p-4 text-sm font-semibold text-amber-700 flex items-center gap-2 border-b border-amber-200/50">
                <AlertCircle size={15} />
                {t("damagedItems") || "Damaged items from inspection"} ({damagedConditions.length})
              </div>
              <div className="divide-y divide-amber-200/50">
                {damagedConditions.map((cond) => (
                  <div key={cond.id || cond.part_name} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-amber-800 truncate">
                        {PART_NAME_LABELS[cond.part_name] || cond.part_name}
                      </span>
                      <span className="shrink-0 rounded-full bg-amber-200/60 px-2 py-0.5 text-xs text-amber-700">
                        {CONDITION_LABELS[cond.condition_state] || cond.condition_state}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addConditionAsLineItem(cond.part_name)}
                      className="h-7 shrink-0 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                    >
                      <Plus size={12} className="mr-1" />
                      {t("addToLineItems") || "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile submit bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{t("create")}</span>
            <Button type="submit" disabled={isLoading} className="min-w-32">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("create")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
