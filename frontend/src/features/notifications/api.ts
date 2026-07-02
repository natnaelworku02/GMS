import { api } from "@/lib/api";
import type { NotificationResponse } from "./types";

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationResponse[], { unread?: boolean } | void>({
      query: (params) => ({ url: "/notifications/", params: params || undefined }),
      providesTags: ["Notifications"],
    }),
    markNotificationRead: build.mutation<NotificationResponse, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} = notificationsApi;
