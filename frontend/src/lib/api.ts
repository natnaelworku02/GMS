import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";

export const api = createApi({
  reducerPath: "api",
  tagTypes: [
    "Auth",
    "Users",
    "Roles",
    "Settings",
    "JobCards",
    "Owners",
    "Vehicles",
    "Performas",
    "InventoryItems",
    "InventoryLocations",
    "Stock",
    "Tools",
    "ToolCheckouts",
    "Employees",
    "Notifications",
    "AuditLogs",
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth?.accessToken;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: () => ({}),
});
