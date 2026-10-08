import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { authService } from '@/services/authService';
import { roleService } from '@/services/roleService';
import { activityLogService } from '@/services/activityLogService';
import { ROLES } from '@/config/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => authService.getSession());

  const setSession = useCallback(newSession => {
    setSessionState(newSession);
  }, []);

  const updateUser = useCallback(patch => {
    const updated = authService.updateUser(patch);
    if (updated) setSessionState(updated);
    return updated;
  }, []);

  const logout = useCallback(async () => {
    const current = authService.getSession();
    if (current?.user) {
      activityLogService.log({
        action: 'auth.logout',
        summary: `${current.user.fullName || current.user.email} signed out`,
        user: current.user,
      });
    }
    await authService.logout();
    setSessionState(null);
  }, []);

  const user = session?.user ?? null;
  const role = user?.role || null;

  const value = useMemo(
    () => ({
      // ---------- State ----------
      user,
      role,
      business: session?.business ?? null,
      isAuthenticated: !!session,

      // ---------- Role predicates (functions) ----------
      isOwner: () => role === ROLES.OWNER,
      isManager: () => role === ROLES.MANAGER,
      isCashier: () => role === ROLES.CASHIER,

      // ---------- Permission checks ----------
      can: action => roleService.can(role, action),
      canAny: actions => roleService.canAny(role, actions),
      canAll: actions => roleService.canAll(role, actions),
      hasGlobalAccess: () => roleService.hasGlobalAccess(role),

      // ---------- Mutations ----------
      setSession,
      updateUser,
      logout,
    }),
    [session, user, role, setSession, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/**
 * Convenience hook — returns only the permission helpers.
 * Use this when a component only needs to check permissions and
 * doesn't care about the user object.
 */
export function usePermissions() {
  const {
    can,
    canAny,
    canAll,
    role,
    isOwner,
    isManager,
    isCashier,
    hasGlobalAccess,
  } = useAuth();
  return {
    can,
    canAny,
    canAll,
    role,
    isOwner,
    isManager,
    isCashier,
    hasGlobalAccess,
  };
}