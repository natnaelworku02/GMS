import { api } from "@/lib/api";
import type { Performa, PerformaCreateDTO } from "./types";

export const performasApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPerformas: build.query<Performa[], { job_card_id?: string } | void>({
      query: (params) => ({ url: "/performas", params: params || undefined }),
      providesTags: ["Performas"],
    }),
    getPerforma: build.query<Performa, string>({
      query: (id) => `/performas/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Performas", id }],
    }),
    createPerforma: build.mutation<Performa, PerformaCreateDTO>({
      query: (body) => ({ url: "/performas", method: "POST", body }),
      invalidatesTags: ["Performas"],
    }),
    sendPerforma: build.mutation<Performa, { id: string; client_email: string }>({
      query: ({ id, client_email }) => ({
        url: `/performas/${id}/send`,
        method: "POST",
        body: { client_email },
      }),
      invalidatesTags: ["Performas"],
    }),
    updatePerformaStatus: build.mutation<Performa, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/performas/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Performas"],
    }),
    revisePerforma: build.mutation<Performa, { id: string; line_items: PerformaCreateDTO["line_items"] }>({
      query: ({ id, line_items }) => ({
        url: `/performas/${id}/revise`,
        method: "POST",
        body: { line_items },
      }),
      invalidatesTags: ["Performas"],
    }),
  }),
});

export const {
  useGetPerformasQuery,
  useGetPerformaQuery,
  useCreatePerformaMutation,
  useSendPerformaMutation,
  useUpdatePerformaStatusMutation,
  useRevisePerformaMutation,
} = performasApi;
