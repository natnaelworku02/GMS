"use client";

import { use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetInvoiceQuery } from "@/features/invoices/api";
import { useAppSelector } from "@/lib/hooks";
import { PerformaLineItems } from "@/features/performas/components/PerformaLineItems";
import { PerformaSummary } from "@/features/performas/components/PerformaSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("performas");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: invoice, isLoading, error } = useGetInvoiceQuery(id);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const handleDownloadPdf = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${id}/pdf`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast.error(tc("error"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-sm text-muted-foreground">Invoice not found</p>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={15} />
          {tc("back")}
        </Button>
      </div>
    );
  }

  const lineItemInputs = invoice.line_items.map((li) => ({
    type: li.type as "labor" | "part",
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unit_price,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/performas")}>
          <ArrowLeft size={15} />
          {tc("back")}
        </Button>
        <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-600">
          {invoice.invoice_number}
        </span>
      </div>

      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="mr-1 h-4 w-4" />
            {t("downloadPdf") || "PDF"}
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Client Email</p>
            <p className="text-sm font-medium">{invoice.client_email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoice Number</p>
            <p className="text-sm font-medium">{invoice.invoice_number}</p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">{t("lineItems")}</h2>
        <PerformaLineItems items={lineItemInputs} onChange={() => {}} readOnly />
        <PerformaSummary
          subtotal={invoice.subtotal}
          vatRate={invoice.vat_rate}
          vatAmount={invoice.vat_amount}
          grandTotal={invoice.grand_total}
        />
      </div>
    </div>
  );
}
