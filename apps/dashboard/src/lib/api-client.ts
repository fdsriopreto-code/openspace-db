import type { ApiErrorBody, LoginResponse, RefreshResponse } from "@openspace-db/shared-types";

/**
 * Access token lives in memory only (never localStorage) — the refresh
 * token is the httpOnly cookie the browser sends automatically. A page
 * reload always re-derives the access token via /api/auth/refresh.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401 && retry && path !== "/api/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(response.status, body?.error.code ?? "UNKNOWN", body?.error.message ?? response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const data = await request<RefreshResponse>("/api/auth/refresh", { method: "POST" }, false);
    setAccessToken(data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export const apiClient = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  refresh: tryRefresh,
  get: <T>(path: string) => request<T>(path),
};
