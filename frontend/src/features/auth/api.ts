import { api } from "@/lib/api";
import type { LoginRequest, Role, TokenResponse, User } from "./types";

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TokenResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    getMe: build.query<User, void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
    refreshToken: build.mutation<TokenResponse, { refresh_token: string }>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
    }),
    getRole: build.query<Role, string>({
      query: (id) => `/roles/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Roles", id }],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRefreshTokenMutation,
  useGetRoleQuery,
  useLazyGetRoleQuery,
} = authApi;
