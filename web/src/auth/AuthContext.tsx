import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, api } from '../lib/api';
import type { AuthUser } from '../lib/api';

interface Ctx {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<Ctx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(auth.user);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!auth.token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api<{ user: AuthUser }>('/auth/me');
      setUser(r.user);
      auth.save(auth.token, r.user);
    } catch {
      auth.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = () => {
    auth.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);