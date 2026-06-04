"use client";

import { useTranslations } from "next-intl";
import { useAppSelector } from "@/lib/hooks";
import { useMemo } from "react";

export default function DashboardPage() {
  const t = useTranslations("common");
  const tnav = useTranslations("nav");
  const { user } = useAppSelector((s) => s.auth);

  const greetingKey = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "greetingMorning" as const;
    if (hour < 17) return "greetingAfternoon" as const;
    return "greetingEvening" as const;
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(greetingKey)}, {user?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">{tnav("dashboard")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title={tnav("jobCards")}
          description="Create and manage repair job cards"
          comingSoon
        />
        <DashboardCard
          title={tnav("performas")}
          description="Generate and send performa invoices"
          comingSoon
        />
        <DashboardCard
          title={tnav("inventory")}
          description="Track parts and stock levels"
          comingSoon
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  comingSoon,
}: {
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  const t = useTranslations("common");

  return (
    <div className="group relative rounded-xl border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {comingSoon && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {t("comingSoon")}
          </span>
        )}
      </div>
    </div>
  );
}
