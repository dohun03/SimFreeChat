import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../services/api';

export type MeUser = {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
  bannedUntil?: string | null;
  banReason?: string | null;
};

type AuthContextValue = {
  user: MeUser | null;
  loading: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const me = await apiGet<MeUser>('/api/users/me', { allowNotOk: true });
      setUser(me ?? null);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiPost('/api/auth/logout', { allowNotOk: true });
    setUser(null);
  }, []);

  useEffect(() => {
    reload();
  }, []); 

  const value = useMemo(() => ({ user, loading, reload, logout }), [user, loading, reload, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider가 필요합니다.');
  return ctx;
}

