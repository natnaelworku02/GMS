import { api } from "@/lib/api";
import type { CheckoutCreateDTO, Tool, ToolCheckout, ToolCreateDTO, ToolUpdateDTO } from "./types";

export const toolsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTools: build.query<Tool[], void>({
      query: () => "/tools/",
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
    getToolCheckouts: build.query<ToolCheckout[], { job_card_id?: string; unreturned_only?: boolean } | void>({
      query: (params) => ({ url: "/tools/checkouts", params: params || undefined }),
      providesTags: ["ToolCheckouts"],
    }),
  }),
});

export const {
  useGetToolsQuery, useGetToolQuery, useCreateToolMutation, useUpdateToolMutation,
  useCheckoutToolMutation, useReturnToolMutation, useGetToolCheckoutsQuery,
} = toolsApi;
