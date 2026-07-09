import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  InventoryItem,
  InventoryItemCreateDTO,
  InventoryLocation,
  StockEntry,
  StockAdjustDTO,
} from "./types";

export const inventoryApi = api.injectEndpoints({
  endpoints: (build) => ({
    // --- Locations ---
    getInventoryLocations: build.query<PaginatedResponse<InventoryLocation>, {
      page?: number; page_size?: number; search?: string;
    } | void>({
      query: (params) => ({ url: "/inventory/locations/", params: params || undefined }),
      providesTags: ["InventoryLocations"],
    }),
    createInventoryLocation: build.mutation<InventoryLocation, { name: string }>({
      query: (body) => ({         url: "/inventory/locations/", method: "POST", body }),
      invalidatesTags: ["InventoryLocations"],
    }),

    // --- Items ---
    getInventoryItems: build.query<PaginatedResponse<InventoryItem>, {
      page?: number; page_size?: number; search?: string; vehicle_type?: string;
    } | void>({
      query: (params) => ({ url: "/inventory/items/", params: params || undefined }),
      providesTags: ["InventoryItems"],
    }),
    getInventoryItem: build.query<InventoryItem, string>({
      query: (id) => `/inventory/items/${id}`,
      providesTags: (_r, _e, id) => [{ type: "InventoryItems", id }],
    }),
    createInventoryItem: build.mutation<InventoryItem, InventoryItemCreateDTO>({
      query: (body) => ({         url: "/inventory/items/", method: "POST", body }),
      invalidatesTags: ["InventoryItems"],
    }),
    updateInventoryItem: build.mutation<InventoryItem, { id: string; body: Partial<InventoryItemCreateDTO> }>({
      query: ({ id, body }) => ({ url: `/inventory/items/${id}`, method: "PATCH", body }),
      invalidatesTags: ["InventoryItems"],
    }),

    // --- Stock ---
    adjustStock: build.mutation<StockEntry, StockAdjustDTO>({
      query: (body) => ({         url: "/inventory/stock/", method: "PUT", body }),
      invalidatesTags: ["InventoryItems", "Stock"],
    }),
  }),
});

export const {
  useGetInventoryLocationsQuery,
  useCreateInventoryLocationMutation,
  useGetInventoryItemsQuery,
  useGetInventoryItemQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useAdjustStockMutation,
} = inventoryApi;
