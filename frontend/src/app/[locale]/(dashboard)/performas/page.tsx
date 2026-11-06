"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useGetPerformasQuery } from "@/features/performas/api";
import { useGetVehiclesQuery } from "@/features/jobCards/api";
import { PerformaStatusBadge } from "@/features/performas/components/PerformaStatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/SearchInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Receipt, Car, Link2 } from "lucide-react";

const statusFilterOptions = ["all", "draft", "sent", "approved", "rejected"];

export default function PerformasListPage() {
  const t = useTranslations("performas");
  const tnav = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: performasResp, isLoading, isError } = useGetPerformasQuery({
    page,
    page_size: 20,
    search: search || undefined,
    status: filter === "all" ? undefined : filter,
  });
  const { data: vehiclesResp } = useGetVehiclesQuery({ page: 1, page_size: 100 });
  const performas = performasResp?.items ?? [];
  const total = performasResp?.total ?? 0;
  const totalPages = performasResp?.total_pages ?? 0;
  const vehicleMap = Object.fromEntries((vehiclesResp?.items ?? []).map((vehicle) => [vehicle.id, vehicle]));

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tnav("performas")}
        description={t("count", { count: total })}
        action={
          <Button onClick={() => router.push("/performas/new")}>
            <Plus size={15} />
            {t("create")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={t("searchPlaceholder")} /></div>
          <div className="flex flex-wrap gap-2">
          {statusFilterOptions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setFilter(s); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              filter === s
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {s === "all" ? t("allStatusFilter") : t(s)}
          </button>
          ))}
          </div>
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-12 text-center text-sm text-destructive">{tc("error")}</div>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)}</div>
      ) : performas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-16 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
            <Receipt className="size-6 text-muted-foreground/50" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("title")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/performas/new")}>
            {t("create")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {performas.map((p, i) => (
            <button
              type="button"
              key={p.id}
              className="animate-fade-in-up group flex w-full cursor-pointer flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated sm:flex-row sm:items-center sm:justify-between"
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => router.push(`/performas/${p.id}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="truncate font-medium">{vehicleMap[p.vehicle_id]?.model || t("vehicle")}</span>
                  <PerformaStatusBadge status={p.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Car size={12} />{vehicleMap[p.vehicle_id]?.plate_number || t("vehicleUnavailable")}</span>
                  <span className="inline-flex items-center gap-1"><Link2 size={12} />{p.job_card_id ? t("linkedJobCard") : t("notLinkedToJob")}</span>
                  <span>{t("versionShort", { version: p.version })} · {new Date(p.created_at).toLocaleDateString(locale)}</span>
                </div>
              </div>
              <div className="w-full border-t border-border/50 pt-3 text-left sm:ml-4 sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
                <p className="font-semibold">{fmt(p.grand_total)}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.client_email || t("noClientEmail")}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {tc("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">{t("pageOf", { page, totalPages })}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {tc("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
