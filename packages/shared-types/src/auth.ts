import type { RoleName } from "./rbac.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  roles: RoleName[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface JwtAccessTokenPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  type: "access";
}

export interface ServiceAccountTokenPayload {
  sub: string;
  type: "service_account";
  roles: RoleName[];
  scopes: string[];
}
