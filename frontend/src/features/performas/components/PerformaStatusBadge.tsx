"use client";

import { useTranslations } from "next-intl";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600 border-amber-200",
  sent: "bg-sky-500/10 text-sky-600 border-sky-200",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export function PerformaStatusBadge({ status }: { status: string }) {
  const t = useTranslations("performas");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}
    >
      {t.has(status) ? t(status) : status}
    </span>
  );
}
