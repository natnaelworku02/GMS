"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetPerformasQuery } from "@/features/performas/api";
import { PerformaStatusBadge } from "@/features/performas/components/PerformaStatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";

const statusFilterOptions = ["all", "draft", "sent", "approved", "rejected"];

export default function PerformasListPage() {
  const t = useTranslations("performas");
  const tnav = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const { data: performasResp } = useGetPerformasQuery({
    page,
    page_size: 20,
    status: filter === "all" ? undefined : filter,
  });
  const performas = performasResp?.items ?? [];
  const total = performasResp?.total ?? 0;
  const totalPages = performasResp?.total_pages ?? 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tnav("performas")}
        description={`${total} performa${total !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => router.push("/performas/new")}>
            <Plus size={15} />
            {t("create")}
          </Button>
        }
      />

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

      {performas.length === 0 ? (
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
            <div
              key={p.id}
              className="animate-fade-in-up group flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card p-4 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => router.push(`/performas/${p.id}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="truncate font-medium">{p.client_email || "—"}</span>
                  <PerformaStatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  v{p.version} &middot; {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="ml-4 text-right">
                <p className="font-semibold">{fmt(p.grand_total)}</p>
                {p.sent_at && <p className="text-xs text-muted-foreground/60">{new Date(p.sent_at).toLocaleDateString()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
