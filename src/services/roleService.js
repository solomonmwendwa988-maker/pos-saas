import { PERMISSIONS, ROLES } from '@/config/permissions';

class RoleService {
  /**
   * Returns true if the given role is allowed to perform the action.
   * Handles the OWNER wildcard and action-scoped permissions.
   */
  can(role, action) {
    if (!role || !action) return false;
    const perms = PERMISSIONS[role];
    if (!perms) return false;
    if (perms.includes('*')) return true;
    if (perms.includes(action)) return true;

    // Scoped permission: sales.view implies sales.view.own is not the
    // reverse. If a role has 'sales.view' they can view all, and that
    // naturally includes their own.
    const parts = action.split('.');
    while (parts.length > 1) {
      parts.pop();
      const parent = parts.join('.');
      if (perms.includes(parent)) return true;
    }

    return false;
  }

  /** Returns true if the role has ANY of the listed actions. */
  canAny(role, actions) {
    return actions.some(a => this.can(role, a));
  }

  /** Returns true if the role has ALL of the listed actions. */
  canAll(role, actions) {
    return actions.every(a => this.can(role, a));
  }

  /** Convenience role predicates. */
  isOwner(role) {
    return role === ROLES.OWNER;
  }
  isManager(role) {
    return role === ROLES.MANAGER;
  }
  isCashier(role) {
    return role === ROLES.CASHIER;
  }

  /** True if the role can see data for the entire business. */
  hasGlobalAccess(role) {
    return this.can(role, 'sales.view') || this.isOwner(role);
  }

  /** List all actions a given role can perform. */
  actions(role) {
    const perms = PERMISSIONS[role];
    if (!perms) return [];
    if (perms.includes('*')) {
      // Expand wildcard to the union of all known actions
      const all = new Set();
      Object.values(PERMISSIONS).forEach(list =>
        list.forEach(a => {
          if (a !== '*') all.add(a);
        })
      );
      return Array.from(all);
    }
    return [...perms];
  }
}

export const roleService = new RoleService();