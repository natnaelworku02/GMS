export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  received_by: string;
  status: "completed" | "reversed";
  reversed_at: string | null;
  reversed_by: string | null;
  reversal_reason: string | null;
  created_at: string;
}

export interface PaymentSummary {
  invoice_id: string;
  invoice_total: number;
  paid_amount: number;
  balance: number;
  payments: Payment[];
}
