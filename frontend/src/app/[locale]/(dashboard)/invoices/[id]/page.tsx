"use client";

import { use, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetInvoiceQuery } from "@/features/invoices/api";
import { useAppSelector } from "@/lib/hooks";
import { PerformaLineItems } from "@/features/performas/components/PerformaLineItems";
import { PerformaSummary } from "@/features/performas/components/PerformaSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Download, CreditCard, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePaymentMutation, useGetInvoicePaymentsQuery, useReversePaymentMutation } from "@/features/payments/api";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("performas");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: invoice, isLoading, error } = useGetInvoiceQuery(id);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const { data: paymentSummary } = useGetInvoicePaymentsQuery(id);
  const [createPayment, { isLoading: recordingPayment }] = useCreatePaymentMutation();
  const [reversePayment, { isLoading: reversingPayment }] = useReversePaymentMutation();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const handlePayment = async () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    try {
      await createPayment({ invoice_id: id, amount: parsed, payment_method: method, reference: reference || undefined, notes: notes || undefined }).unwrap();
      setAmount(""); setReference(""); setNotes("");
      toast.success("Payment recorded");
    } catch { toast.error("Could not record payment"); }
  };

  const handleReverse = async () => {
    if (!reversingId || !reversalReason.trim()) return;
    try {
      await reversePayment({ payment_id: reversingId, invoice_id: id, reason: reversalReason.trim() }).unwrap();
      setReversingId(null); setReversalReason("");
      toast.success("Payment reversed");
    } catch { toast.error("Could not reverse payment"); }
  };

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

      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-sm font-semibold"><CreditCard size={16} /> Payment History</h2><p className="mt-1 text-xs text-muted-foreground">Partial payments remain visible; incorrect payments are reversed, not deleted.</p></div>
          <div className="text-right text-sm"><p>Paid: <strong>ETB {Number(paymentSummary?.paid_amount ?? 0).toLocaleString()}</strong></p><p className="text-muted-foreground">Balance: ETB {Number(paymentSummary?.balance ?? invoice.grand_total).toLocaleString()}</p></div>
        </div>

        {(paymentSummary?.balance ?? invoice.grand_total) > 0 && (
          <div className="grid gap-3 border-y py-4 sm:grid-cols-2">
            <div><Label htmlFor="payment-amount">Amount</Label><Input id="payment-amount" type="number" min="0.01" step="0.01" max={paymentSummary?.balance ?? invoice.grand_total} value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
            <div><Label htmlFor="payment-method">Method</Label><select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option><option value="mobile_money">Mobile Money</option><option value="cheque">Cheque</option></select></div>
            <div><Label htmlFor="payment-reference">Reference</Label><Input id="payment-reference" value={reference} onChange={(event) => setReference(event.target.value)} /></div>
            <div><Label htmlFor="payment-notes">Notes</Label><Input id="payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
            <div className="sm:col-span-2"><Button onClick={handlePayment} disabled={recordingPayment || !Number(amount)}>{recordingPayment && <Loader2 className="h-4 w-4 animate-spin" />} Record Payment</Button></div>
          </div>
        )}

        <div className="divide-y">
          {!paymentSummary?.payments.length ? <p className="py-4 text-sm text-muted-foreground">No payments recorded.</p> : paymentSummary.payments.map((payment) => (
            <div key={payment.id} className="py-3">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">ETB {Number(payment.amount).toLocaleString()} · {payment.payment_method.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleString()}{payment.reference ? ` · ${payment.reference}` : ""}</p>{payment.notes && <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>}</div><div className="text-right">{payment.status === "reversed" ? <span className="text-xs font-medium text-destructive">Reversed</span> : <Button size="sm" variant="ghost" onClick={() => setReversingId(payment.id)}><Undo2 size={14} /> Reverse</Button>}</div></div>
              {payment.status === "reversed" && <p className="mt-2 text-xs text-destructive">Reason: {payment.reversal_reason}</p>}
              {reversingId === payment.id && <div className="mt-3 flex gap-2"><Input value={reversalReason} onChange={(event) => setReversalReason(event.target.value)} placeholder="Reason for reversal" /><Button variant="destructive" onClick={handleReverse} disabled={reversingPayment || !reversalReason.trim()}>Confirm</Button><Button variant="outline" onClick={() => { setReversingId(null); setReversalReason(""); }}>Cancel</Button></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
