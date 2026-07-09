"use client";

import { useState, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useGetPerformaQuery,
  useSendPerformaMutation,
  useUpdatePerformaStatusMutation,
  useRevisePerformaMutation,
} from "@/features/performas/api";
import { useGetInvoiceByPerformaQuery, useCreateInvoiceFromPerformaMutation } from "@/features/invoices/api";
import { useAppSelector } from "@/lib/hooks";
import { PerformaLineItems } from "@/features/performas/components/PerformaLineItems";
import { PerformaSummary } from "@/features/performas/components/PerformaSummary";
import { PerformaStatusBadge } from "@/features/performas/components/PerformaStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Send, ThumbsUp, ThumbsDown, RotateCcw, FileText, Download } from "lucide-react";
import { toast } from "sonner";

export default function PerformaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("performas");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: performa, isLoading } = useGetPerformaQuery(id);
  const [send, { isLoading: sending }] = useSendPerformaMutation();
  const [updateStatus, { isLoading: updating }] = useUpdatePerformaStatusMutation();
  const [revise, { isLoading: revising }] = useRevisePerformaMutation();
  const [createInvoice, { isLoading: creatingInvoice }] = useCreateInvoiceFromPerformaMutation();
  const { data: existingInvoice } = useGetInvoiceByPerformaQuery(id, { skip: performa?.status !== "approved" });
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const [clientEmail, setClientEmail] = useState("");

  const handleSend = async () => {
    if (!clientEmail.trim()) return;
    try {
      await send({ id, client_email: clientEmail.trim() }).unwrap();
    } catch {
      toast.error(tc("error"));
    }
  };

  const handleApprove = async () => {
    try {
      await updateStatus({ id, status: "approved" }).unwrap();
    } catch {
      toast.error(tc("error"));
    }
  };

  const handleReject = async () => {
    try {
      await updateStatus({ id, status: "rejected" }).unwrap();
    } catch {
      toast.error(tc("error"));
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/performas/${id}/pdf`, {
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

  const handleConvertToInvoice = async () => {
    try {
      const invoice = await createInvoice({ performa_id: id }).unwrap();
      toast.success("Invoice created");
      router.push(`/invoices/${invoice.id}`);
    } catch {
      toast.error(tc("error"));
    }
  };

  const handleRevise = async () => {
    if (!performa) return;
    try {
      const newPerf = await revise({
        id,
        line_items: performa.line_items.map((li) => ({
          type: li.type,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
        })),
      }).unwrap();
      router.push(`/performas/${newPerf.id}`);
    } catch {
      toast.error(tc("error"));
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!performa) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <p className="text-sm text-muted-foreground">{t("notFound") || "Not found"}</p>
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
    </div>
  );

  const lineItemInputs = performa.line_items.map((li) => ({
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
        <PerformaStatusBadge status={performa.status} />
      </div>

      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("detail")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              v{performa.version} &middot; {new Date(performa.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("clientEmail")}</p>
            <p className="text-sm font-medium">{performa.client_email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("status")}</p>
            <PerformaStatusBadge status={performa.status} />
          </div>
          {performa.sent_at && (
            <div>
              <p className="text-xs text-muted-foreground">{t("sentAt")}</p>
              <p className="text-sm font-medium">{new Date(performa.sent_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">{t("lineItems")}</h2>
        <PerformaLineItems items={lineItemInputs} onChange={() => {}} readOnly />
        <PerformaSummary
          subtotal={performa.subtotal}
          vatRate={performa.vat_rate}
          vatAmount={performa.vat_amount}
          grandTotal={performa.grand_total}
        />
      </div>

        {/* Actions */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">{tc("actions")}</h2>

          {/* Download PDF */}
          <div>
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-1 h-4 w-4" />
              {t("downloadPdf") || "Download PDF"}
            </Button>
          </div>

          {/* Send */}
        {performa.status === "draft" && (
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder={t("clientEmail")}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
            <Button onClick={handleSend} disabled={sending || !clientEmail.trim()}>
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="mr-1 h-4 w-4" />
              {t("send")}
            </Button>
          </div>
        )}

        {/* Approve / Reject */}
        {performa.status === "sent" && (
          <div className="flex gap-2">
            <Button onClick={handleApprove} disabled={updating}>
              <ThumbsUp className="mr-1 h-4 w-4" />
              {t("approve")}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={updating}>
              <ThumbsDown className="mr-1 h-4 w-4" />
              {t("reject")}
            </Button>
          </div>
        )}

        {/* Convert to Invoice (only when approved) */}
        {performa.status === "approved" && (
          <div className="flex gap-2">
            {existingInvoice ? (
              <Button variant="default" onClick={() => router.push(`/invoices/${existingInvoice.id}`)}>
                <FileText className="mr-1 h-4 w-4" />
                View Invoice ({existingInvoice.invoice_number})
              </Button>
            ) : (
              <Button onClick={handleConvertToInvoice} disabled={creatingInvoice}>
                {creatingInvoice && <Loader2 className="h-4 w-4 animate-spin" />}
                <FileText className="mr-1 h-4 w-4" />
                {t("convertToInvoice") || "Convert to Invoice"}
              </Button>
            )}
            <Button variant="outline" onClick={handleRevise} disabled={revising}>
              {revising && <Loader2 className="h-4 w-4 animate-spin" />}
              <RotateCcw className="mr-1 h-4 w-4" />
              {t("revise")}
            </Button>
          </div>
        )}

        {/* Revise only (when rejected) */}
        {performa.status === "rejected" && (
          <Button variant="outline" onClick={handleRevise} disabled={revising}>
            {revising && <Loader2 className="h-4 w-4 animate-spin" />}
            <RotateCcw className="mr-1 h-4 w-4" />
            {t("revise")}
          </Button>
        )}
      </div>
    </div>
  );
}
