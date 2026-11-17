"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserMe, LoginIn, RegisterIn, VerifyEmailIn, TokenPair } from "@/types/api";
import { api, setStoredTokens, clearStoredTokens, getStoredTokens } from "@/lib/api";

interface AuthContextType {
  user: UserMe | null;
  loading: boolean;
  login: (data: LoginIn) => Promise<UserMe>;
  register: (data: RegisterIn) => Promise<{ message: string; email: string }>;
  verifyEmail: (data: VerifyEmailIn) => Promise<UserMe>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserMe | null>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (): Promise<UserMe | null> => {
    try {
      const { access_token } = getStoredTokens();
      if (!access_token) {
        setUser(null);
        return null;
      }
      const userData = await api.get<UserMe>("/api/v1/users/me/");
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [fetchProfile]);

  const login = async (data: LoginIn): Promise<UserMe> => {
    const tokens = await api.post<TokenPair>("/api/v1/auth/login/", data);
    setStoredTokens(tokens.access_token, tokens.refresh_token);
    const profile = await api.get<UserMe>("/api/v1/users/me/", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    setUser(profile);
    return profile;
  };

  const register = async (data: RegisterIn) => {
    return await api.post<{ message: string; email: string }>("/api/v1/auth/register/", data);
  };

  const verifyEmail = async (data: VerifyEmailIn): Promise<UserMe> => {
    const tokens = await api.post<TokenPair>("/api/v1/auth/verify-email/", data);
    setStoredTokens(tokens.access_token, tokens.refresh_token);
    const profile = await api.get<UserMe>("/api/v1/users/me/", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    setUser(profile);
    return profile;
  };

  const logout = async () => {
    try {
      const { access_token } = getStoredTokens();
      if (access_token) {
        await api.post("/api/v1/auth/logout/");
      }
    } catch {
      // Ignore logout errors
    } finally {
      clearStoredTokens();
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    return await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyEmail,
        logout,
        refreshProfile,
        isAuthenticated: !!user,
        isAdmin: !!user?.is_admin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
