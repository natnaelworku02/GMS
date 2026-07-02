"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateToolMutation } from "@/features/tools/api";
import { toolSchema, type ToolFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewToolPage() {
  const t = useTranslations("tools");
  const router = useRouter();
  const [create, { isLoading }] = useCreateToolMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ToolFormData>({
    resolver: zodResolver(toolSchema),
    defaultValues: { total_quantity: 1 },
  });

  const onSubmit = async (data: ToolFormData) => {
    try {
      await create({
        name: data.name,
        specifications: data.specifications || undefined,
        total_quantity: data.total_quantity,
      }).unwrap();
      router.push("/tools");
    } catch {
      setError("root", { message: "Failed to create tool" });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" onClick={() => router.push("/tools")} className="mb-6">
        <ArrowLeft size={15} />
        {t("title")}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="specifications">{t("specifications")}</Label>
          <Textarea id="specifications" rows={3} {...register("specifications")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_quantity">{t("totalQuantity")}</Label>
          <Input
            id="total_quantity"
            type="number"
            min={1}
            {...register("total_quantity", { valueAsNumber: true })}
          />
          {errors.total_quantity && <p className="text-sm text-destructive">{errors.total_quantity.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Creating..." : t("create")}
        </Button>
      </form>
    </div>
  );
}
