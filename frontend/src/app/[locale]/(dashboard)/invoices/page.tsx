"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetInvoicesQuery } from "@/features/invoices/api";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";

export default function InvoicesListPage() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data: invoicesResp } = useGetInvoicesQuery({ page, page_size: 20 });
  const invoices = invoicesResp?.items ?? [];
  const total = invoicesResp?.total ?? 0;
  const totalPages = invoicesResp?.total_pages ?? 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("invoices")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invoices generated from approved performas</p>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
          <Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No invoices yet</p>
          <p className="text-xs text-muted-foreground mt-1">Invoices are created from approved performas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
              onClick={() => router.push(`/invoices/${inv.id}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                    {inv.invoice_number}
                  </span>
                  <span className="truncate text-sm">{inv.client_email || "—"}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(inv.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmt(inv.grand_total)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
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
