import { createApi } from "@reduxjs/toolkit/query/react";
import { offlineAwareBaseQuery } from "./offline/baseQuery";

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
    "Invoices",
  ],
  baseQuery: offlineAwareBaseQuery,
  endpoints: () => ({}),
});
