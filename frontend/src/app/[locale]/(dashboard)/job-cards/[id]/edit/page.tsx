"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetJobCardQuery, useUpdateJobCardMutation } from "@/features/jobCards/api";
import { jobCardUpdateSchema, type JobCardUpdateFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditJobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const t = useTranslations("jobCards");
  const router = useRouter();
  const { data: jobCard, isLoading: loading } = useGetJobCardQuery(id, { skip: !id });
  const [update, { isLoading: updating }] = useUpdateJobCardMutation();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<JobCardUpdateFormData>({
    resolver: zodResolver(jobCardUpdateSchema),
  });

  useEffect(() => {
    if (jobCard) {
      reset({
        mileage_km: jobCard.mileage_km,
        description: jobCard.description,
        private_paint: jobCard.private_paint,
        private_mechanic: jobCard.private_mechanic,
        insurance_provider: jobCard.insurance_provider || "",
        remarks: jobCard.remarks || "",
        requested_materials: jobCard.requested_materials || "",
      });
    }
  }, [jobCard, reset]);

  const onSubmit = async (data: JobCardUpdateFormData) => {
    try {
      await update({
        id,
        body: {
          mileage_km: data.mileage_km,
          description: data.description,
          private_paint: data.private_paint,
          private_mechanic: data.private_mechanic,
          insurance_provider: data.insurance_provider || null,
          remarks: data.remarks || null,
          requested_materials: data.requested_materials || null,
        },
      }).unwrap();
      router.push(`/job-cards/${id}`);
    } catch {
      setError("root", { message: "Failed to update job card" });
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <Button variant="ghost" onClick={() => router.push(`/job-cards/${id}`)} className="mb-6">
        <ArrowLeft size={15} />
        Back to Job Card
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("edit")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mileage">{t("mileage")}</Label>
            <Input id="mileage" type="number" {...register("mileage_km", { valueAsNumber: true })} />
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
            <Input id="ins" {...register("insurance_provider")} />
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

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="hidden md:block">
          <Button type="submit" disabled={updating}>
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            {updating ? "Saving..." : t("save")}
          </Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Edit job card</span>
            <Button type="submit" disabled={updating} className="min-w-32">
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              {updating ? "Saving..." : t("save")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
