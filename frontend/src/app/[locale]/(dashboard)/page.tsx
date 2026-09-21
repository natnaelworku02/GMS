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
import { ArrowRight, PlusCircle, FileText, Package, Wrench, Receipt, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { JOB_STATUS_LABELS } from "@/lib/constants";
import type { InventoryItem } from "@/features/inventory/types";

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
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
      <div className="animate-fade-in-up grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:items-stretch">
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card md:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{tnav("dashboard")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            {t(greetingKey)}, {user?.full_name?.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Keep the workshop moving from intake to invoice.
          </p>
        </div>
        <StartJobCard
          title={tstart("title")}
          description={tstart("step", { step: 1 })}
          onClick={() => router.push("/start-job")}
        />
      </div>

      <StatCards />

      <div className="animate-fade-in-up" style={{ animationDelay: "0.12s" }}>
        <h2 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title={tnav("jobCards")}
            description={tnav("jobCardsDescription")}
            href="/job-cards"
            icon={FileText}
          />
          <DashboardCard
            title={tnav("performas")}
            description={tnav("performasDescription")}
            href="/performas"
            icon={Receipt}
          />
          <DashboardCard
            title={tnav("invoices")}
            description={tnav("invoicesDescription")}
            href="/invoices"
            icon={Receipt}
          />
          <DashboardCard
            title={tnav("inventory")}
            description={tnav("inventoryDescription")}
            href="/inventory"
            icon={Package}
          />
        </div>
      </div>

      <DashboardCharts />
    </div>
  );
}

function DashboardCharts() {
  const { data: jobCardsResp } = useGetJobCardsQuery({ page: 1, page_size: 100 });
  const jobCards = useMemo(() => jobCardsResp?.items ?? [], [jobCardsResp?.items]);
  const { data: performasResp } = useGetPerformasQuery({ page: 1, page_size: 100 });
  const performas = useMemo(() => performasResp?.items ?? [], [performasResp?.items]);

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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Job Cards by Status" delay="0.05s">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" stroke="none">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
                />
                <Legend iconType="circle" iconSize={8} fontSize={12} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Job Cards Over Time" delay="0.1s">
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
                />
                <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Revenue from Approved Performas" delay="0.15s">
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v) => `ETB ${Number(v).toLocaleString()}`}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 13 }}
                />
                <Bar dataKey="revenue" fill="var(--success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Recent Activity" delay="0.2s" noPadding>
          <div className="flex items-center gap-2 px-4 pt-3">
            <Activity size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
          </div>
          {recentCards.length > 0 ? (
            <ul className="divide-y divide-border/50">
              {recentCards.map((jc) => (
                <li key={jc.id} className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[jc.status] || "#6b7280" }}
                    />
                    <span className="truncate text-sm text-muted-foreground">{jc.description?.slice(0, 35) || "Job card"}</span>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground/60">
                    {new Date(jc.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 pb-4 pt-2">
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children, delay = "0s", noPadding = false }: { title: string; children: React.ReactNode; delay?: string; noPadding?: boolean }) {
  return (
    <div
      className="animate-fade-in-up overflow-hidden rounded-lg border border-border/60 bg-card shadow-card transition-shadow hover:shadow-elevated"
      style={{ animationDelay: delay }}
    >
      {!noPadding && (
        <div className="px-4 pt-3 pb-1">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
      )}
      <div className={noPadding ? "" : "px-2 pb-2"}>{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
      <TrendingUp size={24} className="mb-2" />
      <p className="text-sm">No data yet</p>
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
      className="group relative flex min-h-36 w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-secondary p-4 text-left text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 md:p-5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
      <div className="relative flex w-full flex-col justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <PlusCircle size={21} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-white/75">{description}</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold">
          Open workflow
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Open Job Cards"
        count={jcLoading ? "-" : openJobs}
        icon={FileText}
        gradient="from-indigo-500 to-indigo-600"
        delay="0s"
      />
      <StatCard
        label="Low Stock Items"
        count={invLoading ? "-" : lowStock}
        icon={AlertTriangle}
        gradient="from-amber-500 to-orange-500"
        delay="0.05s"
      />
      <StatCard
        label="Active Checkouts"
        count={coLoading ? "-" : activeCheckouts}
        icon={Wrench}
        gradient="from-emerald-500 to-teal-500"
        delay="0.1s"
      />
      <StatCard
        label="Invoices"
        count={invcLoading ? "-" : invoiceCount}
        icon={Receipt}
        gradient="from-teal-500 to-cyan-500"
        delay="0.15s"
      />
    </div>
  );
}

function StatCard({
  label,
  count,
  icon: Icon,
  gradient,
  delay,
}: {
  label: string;
  count: number | string;
  icon: React.ElementType;
  gradient: string;
  delay: string;
}) {
  return (
    <div
      className="animate-fade-in-up group relative overflow-hidden rounded-lg border border-border/60 bg-card p-3 shadow-card transition-all duration-200 hover:shadow-elevated md:p-5"
      style={{ animationDelay: delay }}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.06] transition-opacity group-hover:opacity-[0.1]" style={{ backgroundImage: `linear-gradient(to bottom right, var(--primary), transparent)` }} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider md:text-xs">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight md:mt-1.5 md:text-3xl">{count}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-lg md:h-11 md:w-11 md:rounded-xl`}
          style={{ boxShadow: `0 8px 16px -4px var(--tw-shadow-color)` }}
        >
          <Icon className="h-5 w-5" />
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
  icon: Icon,
}: {
  title: string;
  description: string;
  comingSoon?: boolean;
  href?: string;
  icon?: React.ElementType;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={href ? () => router.push(href) : undefined}
      className="group relative overflow-hidden rounded-lg border border-border/60 bg-card p-3 text-left shadow-card transition-all duration-200 hover:shadow-elevated md:p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <Icon size={18} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {comingSoon ? (
          <span className="shrink-0 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Coming Soon
          </span>
        ) : (
          <ArrowRight size={14} className="mt-1 shrink-0 text-muted-foreground/30 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
        )}
      </div>
    </button>
  );
}
