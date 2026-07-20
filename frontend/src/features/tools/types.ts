export interface Tool {
  id: string;
  name: string;
  specifications: string | null;
  total_quantity: number;
  available_quantity: number;
  created_at: string;
}

export interface ToolCreateDTO {
  name: string;
  specifications?: string;
  total_quantity: number;
}

export interface ToolUpdateDTO {
  name?: string;
  specifications?: string;
  total_quantity?: number;
}

export interface ToolCheckout {
  id: string;
  tool_id: string;
  employee_id: string;
  job_card_id: string;
  quantity: number;
  checked_out_at: string;
  checked_in_at: string | null;
  issued_by: string;
}

export interface CheckoutCreateDTO {
  tool_id: string;
  employee_id: string;
  job_card_id: string;
  quantity: number;
}
