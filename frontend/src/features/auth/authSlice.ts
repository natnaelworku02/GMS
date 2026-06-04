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
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  permissions: {},
  isSuperAdmin: false,
  isAuthenticated: false,
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
    },
    setPermissions(state, action: PayloadAction<PermissionMap>) {
      state.permissions = action.payload;
    },
    logout(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { setCredentials, setPermissions, logout } = authSlice.actions;
