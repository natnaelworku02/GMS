"use client";

import { useEffect, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetOwnerQuery, useUpdateOwnerMutation, useGetVehiclesQuery } from "@/features/jobCards/api";
import { ownerSchema, type OwnerFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

export default function EditOwnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("owners");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: owner, isLoading: loading } = useGetOwnerQuery(id);
  const { data: vehiclesResp } = useGetVehiclesQuery({ page: 1, page_size: 100 });
  const vehicles = vehiclesResp?.items ?? [];
  const [update, { isLoading: updating }] = useUpdateOwnerMutation();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
  });

  useEffect(() => {
    if (owner) {
      reset({
        name: owner.name,
        phone: owner.phone,
      });
    }
  }, [owner, reset]);

  const ownerVehicles = vehicles.filter((v) => v.owner_id === id);

  const onSubmit = async (data: OwnerFormData) => {
    try {
      await update({
        id,
        body: {
          name: data.name,
          phone: data.phone,
        },
      }).unwrap();
      toast.success(tc("updated"));
      router.push("/owners");
    } catch {
      toast.error(tc("error"));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!owner) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <p className="text-sm text-muted-foreground">{t("notFound") || "Not found"}</p>
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" onClick={() => router.push("/owners")} className="mb-6">
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("edit")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
        <Button type="submit" disabled={updating}>
          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          {tc("save")}
        </Button>
      </form>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">{t("vehicles")}</h2>
        {ownerVehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Truck className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("noVehicles")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ownerVehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{v.model}</span>
                  <span className="ml-2 text-muted-foreground">{v.plate_number}</span>
                </div>
                <span className="text-xs text-muted-foreground">{v.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
