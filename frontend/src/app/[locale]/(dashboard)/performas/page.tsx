"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetPerformasQuery } from "@/features/performas/api";
import { PerformaStatusBadge } from "@/features/performas/components/PerformaStatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";

const statusFilterOptions = ["all", "draft", "sent", "approved", "rejected"];

export default function PerformasListPage() {
  const t = useTranslations("performas");
  const tnav = useTranslations("nav");
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const { data: performas = [] } = useGetPerformasQuery();

  const filtered = filter === "all" ? performas : performas.filter((p) => p.status === filter);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tnav("performas")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("title")}</p>
        </div>
        <Button onClick={() => router.push("/performas/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilterOptions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "all" ? t("allStatusFilter") : t(s)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
          <Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("title")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/performas/new")}>
            {t("create")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
              onClick={() => router.push(`/performas/${p.id}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.client_email || "—"}</span>
                  <PerformaStatusBadge status={p.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  v{p.version} &middot; {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmt(p.grand_total)}</p>
                {p.sent_at && <p className="text-xs text-muted-foreground">{new Date(p.sent_at).toLocaleDateString()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
