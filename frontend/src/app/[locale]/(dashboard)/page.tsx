"use client";

import { useTranslations } from "next-intl";
import { useAppSelector } from "@/lib/hooks";
import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, PlusCircle } from "lucide-react";

export default function DashboardPage() {
  const t = useTranslations("common");
  const tnav = useTranslations("nav");
  const tstart = useTranslations("startJob");
  const { user } = useAppSelector((s) => s.auth);
  const router = useRouter();

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
        <StartJobCard
          title={tstart("title")}
          description={tstart("step", { step: 1 })}
          onClick={() => router.push("/start-job")}
        />
        <DashboardCard
          title={tnav("jobCards")}
          description={tnav("jobCardsDescription")}
          href="/job-cards"
        />
        <DashboardCard
          title={tnav("performas")}
          description={tnav("performasDescription")}
          href="/performas"
        />
        <DashboardCard
          title={tnav("inventory")}
          description={tnav("inventoryDescription")}
          comingSoon
        />
      </div>
    </div>
  );
}

function StartJobCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative col-span-1 sm:col-span-2 lg:col-span-1 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 p-5 text-left text-white shadow-sm transition-all hover:shadow-md hover:from-indigo-400 hover:to-teal-400"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PlusCircle size={20} className="text-white/80" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <p className="mt-2 text-sm text-white/80">{description} &rarr;</p>
        </div>
      </div>
    </button>
  );
}

function DashboardCard({
  title,
  description,
  comingSoon,
  href,
}: {
  title: string;
  description: string;
  comingSoon?: boolean;
  href?: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={href ? () => router.push(href) : undefined}
      className="group relative rounded-xl border bg-card p-5 text-left transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {comingSoon ? (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {t("comingSoon")}
          </span>
        ) : (
          <ArrowRight size={16} className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}
