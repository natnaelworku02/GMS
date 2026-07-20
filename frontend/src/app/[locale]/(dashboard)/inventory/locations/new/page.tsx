"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateInventoryLocationMutation } from "@/features/inventory/api";
import { inventoryLocationSchema, type InventoryLocationFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NewInventoryLocationPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [create, { isLoading }] = useCreateInventoryLocationMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<InventoryLocationFormData>({
    resolver: zodResolver(inventoryLocationSchema),
  });

  const onSubmit = async (data: InventoryLocationFormData) => {
    try {
      await create({ name: data.name }).unwrap();
      toast.success(t("createLocation"));
      router.push("/inventory/locations");
    } catch {
      toast.error(tc("error"));
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" onClick={() => router.push("/inventory/locations")} className="mb-6">
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("createLocation")}</h1>

      <form id="location-form" onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t("location")}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("createLocation")}
        </Button>
      </form>

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg p-4 sm:hidden">
        <Button type="submit" className="w-full" disabled={isLoading} form="location-form">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("createLocation")}
        </Button>
      </div>
    </div>
  );
}
