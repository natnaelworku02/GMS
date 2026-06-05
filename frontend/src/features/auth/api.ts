import { api } from "@/lib/api";
import type {
  CreateUserDTO,
  LoginRequest,
  PermissionSet,
  Role,
  TokenResponse,
  UpdateUserDTO,
  User,
} from "./types";

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
      providesTags: (_r, _e, id) => [{ type: "Roles", id }],
    }),
    getUsers: build.query<User[], Record<string, string> | void>({
      query: (params) => ({
        url: "/auth/users",
        params: params || undefined,
      }),
      providesTags: ["Users"],
    }),
    getUser: build.query<User, string>({
      query: (id) => `/auth/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Users", id }],
    }),
    createUser: build.mutation<User, CreateUserDTO>({
      query: (body) => ({
        url: "/auth/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUser: build.mutation<User, { id: string; body: Partial<UpdateUserDTO> }>({
      query: ({ id, body }) => ({
        url: `/auth/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    resetPassword: build.mutation<void, { id: string; password: string }>({
      query: ({ id, password }) => ({
        url: `/auth/users/${id}/password`,
        method: "PATCH",
        body: { new_password: password },
      }),
    }),
    getRoles: build.query<Role[], void>({
      query: () => "/roles/",
      providesTags: ["Roles"],
    }),
    createRole: build.mutation<Role, { name: string; is_superadmin: boolean }>({
      query: (body) => ({
        url: "/roles/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Roles"],
    }),
    updatePermissions: build.mutation<
      Role,
      { id: string; permissions: PermissionSet[] }
    >({
      query: ({ id, permissions }) => ({
        url: `/roles/${id}/permissions`,
        method: "PUT",
        body: permissions,
      }),
      invalidatesTags: ["Roles"],
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
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useResetPasswordMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdatePermissionsMutation,
} = authApi;
