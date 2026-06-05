export interface User {
  id: string;
  phone: string;
  full_name: string;
  role_id: string;
  role_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface PermissionSet {
  module: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  is_superadmin: boolean;
  permissions: PermissionSet[];
  created_at: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
