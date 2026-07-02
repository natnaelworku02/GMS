"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreatePerformaMutation } from "@/features/performas/api";
import { useGetJobCardQuery, useGetVehicleQuery } from "@/features/jobCards/api";
import { PerformaLineItems } from "@/features/performas/components/PerformaLineItems";
import { PerformaSummary } from "@/features/performas/components/PerformaSummary";
import { performaCreateSchema, type PerformaCreateFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { LineItemInput } from "@/features/performas/types";

export default function NewPerformaPage({ searchParams }: { searchParams: Promise<{ job_card_id?: string }> }) {
  const [params, setParams] = useState<{ job_card_id?: string }>({});
  useEffect(() => { searchParams.then(setParams); }, [searchParams]);

  const t = useTranslations("performas");
  const router = useRouter();
  const jobCardIdFromUrl = params.job_card_id || "";
  const [create, { isLoading }] = useCreatePerformaMutation();

  const [jobCardId, setJobCardId] = useState(jobCardIdFromUrl);
  const { data: jobCard } = useGetJobCardQuery(jobCardId, { skip: !jobCardId });
  const { data: vehicle } = useGetVehicleQuery(jobCard?.vehicle_id || "", { skip: !jobCard?.vehicle_id });
  const [lineItems, setLineItems] = useState<LineItemInput[]>([{ type: "labor", description: "", quantity: 1, unit_price: 0 }]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PerformaCreateFormData>({
    resolver: zodResolver(performaCreateSchema),
    defaultValues: { job_card_id: jobCardIdFromUrl, client_email: "", line_items: lineItems },
  });

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const vatRate = 15;
  const vatAmount = subtotal * (vatRate / 100);
  const grandTotal = subtotal + vatAmount;

  const onSubmit = async (data: PerformaCreateFormData) => {
    if (!lineItems.some((li) => li.description.trim())) {
      toast.error("All line items must have a description");
      return;
    }
    try {
      const perf = await create({
        job_card_id: jobCardId,
        client_email: data.client_email || undefined,
        line_items: lineItems.map((li) => ({ ...li, description: li.description.trim() })),
      }).unwrap();
      toast.success("Performa created successfully");
      router.push(`/performas/${perf.id}`);
    } catch {
      toast.error("Failed to create performa");
    }
  };

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <Button variant="ghost" onClick={() => router.push("/performas")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Performas
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Job Card Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">Job Card</h2>
          <div className="space-y-2">
            <Label htmlFor="jc">Job Card ID</Label>
            <Input
              id="jc"
              value={jobCardId}
              onChange={(e) => setJobCardId(e.target.value)}
              placeholder="Enter job card ID"
            />
            {jobCard && (
              <p className="text-xs text-muted-foreground">
                {vehicle?.model || "—"} — {vehicle?.plate_number || "—"}
              </p>
            )}
          </div>
        </div>

        {/* Client Email */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">{t("detail")}</h2>
          <div className="space-y-2">
            <Label htmlFor="email">{t("clientEmail")}</Label>
            <Input id="email" type="email" placeholder="client@example.com" {...register("client_email")} />
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">{t("lineItems")}</h2>
          <PerformaLineItems items={lineItems} onChange={setLineItems} />
          {errors.line_items && <p className="text-sm text-destructive">{errors.line_items.message}</p>}
          <PerformaSummary subtotal={subtotal} vatRate={vatRate} vatAmount={vatAmount} grandTotal={grandTotal} />
        </div>

        <div className="hidden md:block">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("create")}
          </Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
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
