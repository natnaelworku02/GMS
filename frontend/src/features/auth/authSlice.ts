import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type PermissionMap = Record<string, boolean>;

type AuthState = {
  user: {
    id: string;
    phone: string;
    full_name: string;
    role_id: string;
    role_name?: string;
    is_active: boolean;
  } | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: PermissionMap;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  permissions: {},
  isSuperAdmin: false,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        user: AuthState["user"];
        accessToken: string;
        refreshToken: string;
        permissions?: PermissionMap;
        isSuperAdmin?: boolean;
      }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.permissions = action.payload.permissions || {};
      state.isSuperAdmin = action.payload.isSuperAdmin || false;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    setPermissions(state, action: PayloadAction<PermissionMap>) {
      state.permissions = action.payload;
    },
    setTokens(
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
      }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    logout(state) {
      Object.assign(state, { ...initialState, isLoading: false });
    },
  },
});

export const {
  setCredentials,
  setPermissions,
  setTokens,
  setLoading,
  setError,
  logout,
} = authSlice.actions;
