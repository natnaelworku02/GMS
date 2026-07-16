import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { Invoice } from "./types";

export const invoicesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getInvoices: build.query<PaginatedResponse<Invoice>, {
      page?: number; page_size?: number; search?: string;
    } | void>({
      query: (params) => ({ url: "/invoices/", params: params || undefined }),
      providesTags: ["Invoices"],
    }),
    getInvoice: build.query<Invoice, string>({
      query: (id) => `/invoices/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Invoices", id }],
    }),
    createInvoiceFromPerforma: build.mutation<Invoice, { performa_id: string }>({
      query: (body) => ({
        url: "/invoices/from-performa",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices"],
    }),
    getInvoiceByPerforma: build.query<Invoice | null, string>({
      query: (performa_id) => `/invoices/by-performa/${performa_id}`,
      providesTags: (_r, _e, id) => [{ type: "Invoices", id: `by-performa-${id}` }],
      transformResponse: (resp: Invoice | null) => resp ?? null,
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceFromPerformaMutation,
  useGetInvoiceByPerformaQuery,
} = invoicesApi;
