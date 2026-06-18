"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateOwnerMutation } from "@/features/jobCards/api";
import { ownerSchema, type OwnerFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewOwnerPage() {
  const t = useTranslations("owners");
  const router = useRouter();
  const [create, { isLoading }] = useCreateOwnerMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: { owner_type: "individual", phone_secondary: "", email: "" },
  });

  const onSubmit = async (data: OwnerFormData) => {
    try {
      await create({
        name: data.name,
        phone: data.phone,
        phone_secondary: data.phone_secondary || undefined,
        email: data.email || undefined,
        owner_type: data.owner_type,
      }).unwrap();
      router.push("/owners");
    } catch {
      setError("root", { message: "Failed to create owner" });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" onClick={() => router.push("/owners")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Owners
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input id="phone" {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone2">{t("phoneSecondary")}</Label>
            <Input id="phone2" {...register("phone_secondary")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">{t("ownerType")}</Label>
            <select id="type" {...register("owner_type")}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="individual">Individual</option>
              <option value="corporate">Corporate Fleet</option>
              <option value="insurance">Insurance Company</option>
            </select>
          </div>
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
