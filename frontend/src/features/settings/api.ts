import { api } from "@/lib/api";
import type { Setting } from "./types";

export const settingsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<Setting[], void>({
      query: () => "/settings/",
      providesTags: ["Settings"],
    }),
    updateSetting: build.mutation<Setting, { key: string; value: string }>({
      query: ({ key, value }) => ({
        url: `/settings/${key}`,
        method: "PUT",
        body: { value },
      }),
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingMutation } = settingsApi;
