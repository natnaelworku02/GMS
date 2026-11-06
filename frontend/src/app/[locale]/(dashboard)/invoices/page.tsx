"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetInvoicesQuery } from "@/features/invoices/api";
import type { Invoice } from "@/features/invoices/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";

export default function InvoicesListPage() {
  const t = useTranslations("invoices");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: invoicesResp, isLoading, isError } = useGetInvoicesQuery({
    page,
    page_size: 20,
    search: search || undefined,
  });
  const invoices = invoicesResp?.items ?? [];
  const total = invoicesResp?.total ?? 0;

  const fmt = (amount: number) =>
    new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount);

  const columns: Column<Invoice>[] = [
    {
      key: "invoice_number",
      header: t("invoiceNumber"),
      render: (invoice) => (
        <span className="inline-flex rounded-md bg-indigo-500/10 px-2 py-1 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-300">
          {invoice.invoice_number}
        </span>
      ),
    },
    {
      key: "client_email",
      header: t("clientEmail"),
      render: (invoice) => <span className="break-all text-sm text-muted-foreground">{invoice.client_email || tc("notAvailable")}</span>,
    },
    {
      key: "grand_total",
      header: t("total"),
      render: (invoice) => <span className="font-semibold tabular-nums">{fmt(invoice.grand_total)}</span>,
      sortable: true,
    },
    {
      key: "created_at",
      header: t("createdAt"),
      render: (invoice) => <span className="text-sm text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString(locale)}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title={t("title")} description={t("count", { count: total })} />
      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        emptyMessage={t("empty")}
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={search}
        onSearch={(value) => { setSearch(value); setPage(1); }}
        serverTotal={total}
        serverPage={page}
        serverPageSize={20}
        onServerPageChange={setPage}
        onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
      />
    </div>
  );
}
