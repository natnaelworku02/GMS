import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/lib/store";
import { addMutation, getMutationCount } from "./queue";
import { cacheQuery, getCachedQuery } from "./cache";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth?.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

function isNetworkError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return (error as FetchBaseQueryError).status === "FETCH_ERROR";
  }
  return false;
}

function getMethod(args: FetchArgs | string): string {
  if (typeof args === "string") return "GET";
  return args.method ?? "GET";
}

function asFetchArgs(args: FetchArgs | string): FetchArgs | null {
  if (typeof args === "string") return null;
  return args;
}

export const offlineAwareBaseQuery: BaseQueryFn<
  FetchArgs | string,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  const method = getMethod(args);
  const fetchArgs = asFetchArgs(args);

  if (result.error && isNetworkError(result.error)) {
    if (fetchArgs && method !== "GET") {
      const mutation: Parameters<typeof addMutation>[0] = {
        id: crypto.randomUUID(),
        endpoint: fetchArgs.url,
        method: (method as "POST" | "PATCH" | "PUT" | "DELETE") ?? "POST",
        body: fetchArgs.body,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
        entityType: extractEntityType(fetchArgs.url),
      };
      await addMutation(mutation);
      const count = await getMutationCount();
      window.dispatchEvent(new CustomEvent("mutation-queued", { detail: { count } }));
      return { data: { queued: true, id: mutation.id } };
    }

    if (fetchArgs) {
      const cacheKey = `${fetchArgs.method ?? "GET"}:${fetchArgs.url}`;
      const cached = await getCachedQuery(cacheKey);
      if (cached) {
        return { data: cached.data };
      }
    }
  }

  if (!result.error && fetchArgs && method === "GET") {
    const cacheKey = `${fetchArgs.method ?? "GET"}:${fetchArgs.url}`;
    await cacheQuery(cacheKey, result.data);
  }

  return result;
};

function extractEntityType(url: string): string {
  const parts = url.split("/").filter(Boolean);
  for (const part of parts) {
    if (
      [
        "job-cards",
        "owners",
        "vehicles",
        "performas",
        "inventory",
        "tools",
        "employees",
        "users",
        "roles",
        "notifications",
        "invoices",
      ].includes(part)
    ) {
      return part;
    }
  }
  return "unknown";
}
