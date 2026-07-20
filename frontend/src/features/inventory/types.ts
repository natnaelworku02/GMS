export interface InventoryLocation {
  id: string;
  name: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  part_name: string;
  applicable_vehicle_types: string[] | null;
  unit_price: number;
  supplier_info: string;
  min_stock_threshold: number;
  created_at: string;
  stock_entries: StockEntry[];
}

export interface StockEntry {
  id: string;
  store_location_id: string;
  quantity: number;
}

export interface InventoryItemCreateDTO {
  part_name: string;
  applicable_vehicle_types?: string[];
  unit_price: number;
  supplier_info?: string;
  min_stock_threshold?: number;
}

export interface StockAdjustDTO {
  item_id: string;
  store_location_id: string;
  quantity: number;
}

export interface StockDeltaDTO {
  item_id: string;
  store_location_id: string;
  delta: number;
}
