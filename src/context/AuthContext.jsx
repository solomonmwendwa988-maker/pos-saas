import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authService } from '@/services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => authService.getSession());

  const setSession = useCallback(s => setSessionState(s), []);

  const updateUser = useCallback(patch => {
    const updated = authService.updateUser(patch);
    if (updated) setSessionState(updated);
    return updated;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      business: session?.business ?? null,
      isAuthenticated: !!session,
      setSession,
      updateUser,
      logout,
    }),
    [session, setSession, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}