"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useGetPerformaQuery,
  useSendPerformaMutation,
  useUpdatePerformaStatusMutation,
  useRevisePerformaMutation,
} from "@/features/performas/api";
import { PerformaLineItems } from "@/features/performas/components/PerformaLineItems";
import { PerformaSummary } from "@/features/performas/components/PerformaSummary";
import { PerformaStatusBadge } from "@/features/performas/components/PerformaStatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Send, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";

export default function PerformaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const t = useTranslations("performas");
  const router = useRouter();
  const { data: performa, isLoading } = useGetPerformaQuery(id, { skip: !id });
  const [send, { isLoading: sending }] = useSendPerformaMutation();
  const [updateStatus, { isLoading: updating }] = useUpdatePerformaStatusMutation();
  const [revise, { isLoading: revising }] = useRevisePerformaMutation();

  const [clientEmail, setClientEmail] = useState("");

  const handleSend = async () => {
    if (!clientEmail.trim()) return;
    try {
      await send({ id, client_email: clientEmail.trim() }).unwrap();
    } catch {}
  };

  const handleApprove = async () => {
    try {
      await updateStatus({ id, status: "approved" }).unwrap();
    } catch {}
  };

  const handleReject = async () => {
    try {
      await updateStatus({ id, status: "rejected" }).unwrap();
    } catch {}
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
    } catch {}
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!performa) return <div className="p-8 text-center text-muted-foreground">Performa not found</div>;

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
          Back to Performas
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
        <h2 className="text-sm font-semibold">Actions</h2>

        {/* Send */}
        {performa.status === "draft" && (
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder={t("clientEmail")}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        {/* Revise */}
        {(performa.status === "approved" || performa.status === "rejected") && (
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
