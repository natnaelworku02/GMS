import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { CheckoutCreateDTO, Tool, ToolCheckout, ToolCreateDTO, ToolUpdateDTO } from "./types";

export const toolsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTools: build.query<PaginatedResponse<Tool>, {
      page?: number; page_size?: number; search?: string;
    } | void>({
      query: (params) => ({ url: "/tools/", params: params || undefined }),
      providesTags: ["Tools"],
    }),
    getTool: build.query<Tool, string>({
      query: (id) => `/tools/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Tools", id }],
    }),
    createTool: build.mutation<Tool, ToolCreateDTO>({
      query: (body) => ({ url: "/tools/", method: "POST", body }),
      invalidatesTags: ["Tools"],
    }),
    deleteTool: build.mutation<void, string>({
      query: (id) => ({ url: `/tools/${id}`, method: "DELETE" }),
      invalidatesTags: ["Tools"],
    }),
    updateTool: build.mutation<Tool, { id: string; body: ToolUpdateDTO }>({
      query: ({ id, body }) => ({ url: `/tools/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Tools"],
    }),

    // --- Checkouts ---
    checkoutTool: build.mutation<ToolCheckout, CheckoutCreateDTO>({
      query: (body) => ({ url: "/tools/checkouts", method: "POST", body }),
      invalidatesTags: ["ToolCheckouts"],
    }),
    returnTool: build.mutation<ToolCheckout, string>({
      query: (id) => ({ url: `/tools/checkouts/${id}/return`, method: "PATCH" }),
      invalidatesTags: ["ToolCheckouts", "Tools"],
    }),
    getToolCheckouts: build.query<PaginatedResponse<ToolCheckout>, {
      page?: number; page_size?: number; search?: string;
      job_card_id?: string; unreturned_only?: boolean;
      employee_id?: string; tool_id?: string;
    } | void>({
      query: (params) => ({ url: "/tools/checkouts", params: params || undefined }),
      providesTags: ["ToolCheckouts"],
    }),
  }),
});

export const {
  useGetToolsQuery, useGetToolQuery, useCreateToolMutation, useUpdateToolMutation, useDeleteToolMutation,
  useCheckoutToolMutation, useReturnToolMutation, useGetToolCheckoutsQuery,
} = toolsApi;
