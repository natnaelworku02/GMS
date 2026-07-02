"use client";

import { useTranslations } from "next-intl";
import { useAppSelector } from "@/lib/hooks";
import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useGetJobCardsQuery } from "@/features/jobCards/api";
import { useGetInventoryItemsQuery } from "@/features/inventory/api";
import { useGetToolCheckoutsQuery } from "@/features/tools/api";
import { ArrowRight, PlusCircle, FileText, Package, Wrench } from "lucide-react";
import type { InventoryItem } from "@/features/inventory/types";

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

      <StatCards />
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

const totalStock = (item: InventoryItem) =>
  item.stock_entries.reduce((sum, se) => sum + se.quantity, 0);

function StatCards() {
  const { data: jobCards = [], isLoading: jcLoading } = useGetJobCardsQuery();
  const { data: inventory = [], isLoading: invLoading } = useGetInventoryItemsQuery();
  const { data: checkouts = [], isLoading: coLoading } = useGetToolCheckoutsQuery(
    { unreturned_only: true },
  );

  const openJobs = jobCards.filter((jc) => jc.status !== "completed").length;
  const lowStock = inventory.filter(
    (item) => item.min_stock_threshold && totalStock(item) <= item.min_stock_threshold,
  ).length;
  const activeCheckouts = checkouts.filter((c) => !c.checked_in_at).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <StatCard
        label="Open Job Cards"
        count={jcLoading ? "-" : openJobs}
        icon={FileText}
        gradient="from-indigo-500/10 to-indigo-500/5"
        iconColor="text-indigo-500"
      />
      <StatCard
        label="Low Stock Items"
        count={invLoading ? "-" : lowStock}
        icon={Package}
        gradient="from-amber-500/10 to-rose-500/5"
        iconColor="text-amber-500"
      />
      <StatCard
        label="Active Checkouts"
        count={coLoading ? "-" : activeCheckouts}
        icon={Wrench}
        gradient="from-emerald-500/10 to-emerald-500/5"
        iconColor="text-emerald-500"
      />
    </div>
  );
}

function StatCard({
  label,
  count,
  icon: Icon,
  gradient,
  iconColor,
}: {
  label: string;
  count: number | string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{count}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
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
