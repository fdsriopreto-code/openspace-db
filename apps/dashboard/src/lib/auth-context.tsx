import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthenticatedUser } from "@openspace-db/shared-types";
import { apiClient, setAccessToken } from "./api-client";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    void (async () => {
      const refreshed = await apiClient.refresh();
      if (!refreshed) {
        setStatus("anonymous");
        return;
      }
      try {
        const me = await apiClient.get<AuthenticatedUser>("/api/auth/me");
        setUser(me);
        setStatus("authenticated");
      } catch {
        setStatus("anonymous");
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiClient.login(email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus("authenticated");
  };

  const logout = async () => {
    await apiClient.logout();
    setAccessToken(null);
    setUser(null);
    setStatus("anonymous");
  };

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
