"use client";

import { useTranslations } from "next-intl";
import { useAppSelector } from "@/lib/hooks";
import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useGetJobCardsQuery } from "@/features/jobCards/api";
import { useGetInventoryItemsQuery } from "@/features/inventory/api";
import { useGetToolCheckoutsQuery } from "@/features/tools/api";
import { useGetInvoicesQuery } from "@/features/invoices/api";
import { useGetPerformasQuery } from "@/features/performas/api";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { ArrowRight, PlusCircle, FileText, Package, Wrench, Receipt, Activity } from "lucide-react";
import { JOB_STATUS_LABELS } from "@/lib/constants";
import type { InventoryItem } from "@/features/inventory/types";
import type { JobCard } from "@/features/jobCards/types";

const STATUS_COLORS: Record<string, string> = {
  pending_inspection: "#f59e0b",
  waiting_for_approval: "#3b82f6",
  in_repair: "#8b5cf6",
  waiting_for_parts: "#ef4444",
  ready_for_testing: "#06b6d4",
  completed: "#22c55e",
};

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
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(greetingKey)}, {user?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">{tnav("dashboard")}</p>
      </div>

      <StatCards />
      <DashboardCharts />
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
          title={tnav("invoices")}
          description={tnav("invoicesDescription")}
          href="/invoices"
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

function DashboardCharts() {
  const { data: jobCardsResp } = useGetJobCardsQuery({ page: 1, page_size: 100 });
  const jobCards = jobCardsResp?.items ?? [];
  const { data: performasResp } = useGetPerformasQuery({ page: 1, page_size: 100 });
  const performas = performasResp?.items ?? [];

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const jc of jobCards) {
      counts[jc.status] = (counts[jc.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: JOB_STATUS_LABELS[name] || name,
      value,
      color: STATUS_COLORS[name] || "#6b7280",
    }));
  }, [jobCards]);

  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {};
    for (const jc of jobCards) {
      const d = new Date(jc.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks[key] = (weeks[key] || 0) + 1;
    }
    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  }, [jobCards]);

  const revenueData = useMemo(() => {
    const months: Record<string, number> = {};
    for (const p of performas) {
      if (p.status !== "approved") continue;
      const d = new Date(p.created_at);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months[key] = (months[key] || 0) + p.grand_total;
    }
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [performas]);

  const recentCards = useMemo(() =>
    [...jobCards].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
  [jobCards]);

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Job Cards by Status</h3>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" fontSize={12} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet</p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Job Cards Over Time</h3>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet</p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Revenue from Approved Performas</h3>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v) => `ETB ${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet</p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Activity size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
        </div>
        {recentCards.length > 0 ? (
          <ul className="space-y-2">
            {recentCards.map((jc) => (
              <li key={jc.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[jc.status] || "#6b7280" }}
                  />
                  <span className="text-muted-foreground">{jc.description?.slice(0, 30) || "Job card"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(jc.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet</p>
        )}
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
  const { data: jobCardsResp, isLoading: jcLoading } = useGetJobCardsQuery({ page: 1, page_size: 100 });
  const jobCards = jobCardsResp?.items ?? [];
  const { data: inventoryResp, isLoading: invLoading } = useGetInventoryItemsQuery({ page: 1, page_size: 100 });
  const inventory = inventoryResp?.items ?? [];
  const { data: checkoutsResp, isLoading: coLoading } = useGetToolCheckoutsQuery(
    { page: 1, page_size: 100, unreturned_only: true },
  );
  const checkouts = checkoutsResp?.items ?? [];
  const { data: invoicesResp, isLoading: invcLoading } = useGetInvoicesQuery({ page: 1, page_size: 1 });
  const invoiceCount = invoicesResp?.total ?? 0;

  const openJobs = jobCards.filter((jc) => jc.status !== "completed").length;
  const lowStock = inventory.filter(
    (item) => item.min_stock_threshold && totalStock(item) <= item.min_stock_threshold,
  ).length;
  const activeCheckouts = checkouts.filter((c) => !c.checked_in_at).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      <StatCard
        label="Invoices"
        count={invcLoading ? "-" : invoiceCount}
        icon={Receipt}
        gradient="from-teal-500/10 to-teal-500/5"
        iconColor="text-teal-500"
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
