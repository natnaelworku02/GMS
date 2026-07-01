export interface PerformaLineItem {
  id: string;
  performa_id: string;
  type: "labor" | "part";
  description: string;
  inventory_item_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface LineItemInput {
  type: "labor" | "part";
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Performa {
  id: string;
  job_card_id: string;
  version: number;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  status: string;
  client_email: string | null;
  sent_at: string | null;
  created_at: string;
  line_items: PerformaLineItem[];
}

export interface PerformaCreateDTO {
  job_card_id: string;
  client_email?: string;
  line_items: LineItemInput[];
}
