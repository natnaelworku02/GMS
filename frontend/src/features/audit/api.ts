import { api } from "@/lib/api";
import type { AuditLog } from "./types";

export const auditApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAuditLogs: build.query<AuditLog[], Record<string, string> | void>({
      query: (params) => ({ url: "/audit-logs/", params: params || undefined }),
      providesTags: ["AuditLogs"],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditApi;
