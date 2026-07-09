export interface InvoiceLineItem {
  id: string;
  type: "labor" | "part";
  description: string;
  inventory_item_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  performa_id: string;
  job_card_id: string;
  invoice_number: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  client_email: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
}
