import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { AuditLog } from "./types";

export type AuditLogFilters = {
  page?: number;
  page_size?: number;
  search?: string;
  entity_type?: string;
  entity_id?: string;
};

export const auditApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAuditLogs: build.query<PaginatedResponse<AuditLog>, AuditLogFilters | void>({
      query: (params) => ({ url: "/audit-logs/", params: params || undefined }),
      providesTags: ["AuditLogs"],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditApi;
