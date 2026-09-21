import { api } from "@/lib/api";
import type { Payment, PaymentSummary } from "./types";

export const paymentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getInvoicePayments: build.query<PaymentSummary, string>({
      query: (invoiceId) => `/payments/invoice/${invoiceId}`,
      providesTags: (_r, _e, id) => [{ type: "Payments", id }],
    }),
    createPayment: build.mutation<Payment, { invoice_id: string; amount: number; payment_method: string; reference?: string; notes?: string }>({
      query: (body) => ({ url: "/payments/", method: "POST", body }),
      invalidatesTags: (_r, _e, body) => [{ type: "Payments", id: body.invoice_id }],
    }),
    reversePayment: build.mutation<Payment, { payment_id: string; invoice_id: string; reason: string }>({
      query: ({ payment_id, reason }) => ({ url: `/payments/${payment_id}/reverse`, method: "POST", body: { reason } }),
      invalidatesTags: (_r, _e, body) => [{ type: "Payments", id: body.invoice_id }],
    }),
  }),
});

export const { useGetInvoicePaymentsQuery, useCreatePaymentMutation, useReversePaymentMutation } = paymentsApi;
