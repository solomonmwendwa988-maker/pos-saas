/**
 * Central permission matrix.
 *
 * Every action in the app that needs authorization has a name here.
 * Roles map to arrays of actions they can perform. `OWNER` uses `*`
 * as a wildcard that expands to every action.
 *
 * To add a new permission:
 *   1. Add the string to the roles that should have it
 *   2. Add a human label to ACTION_LABELS (for the activity log)
 *   3. Use it via <RoleGate action="..."> in components, or
 *      <RequireRole action="..."> on routes
 *
 * Nothing else needs to change — roleService.can() reads directly
 * from this map.
 */

export const ROLES = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
};

export const ROLE_LABELS = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
};

export const ROLE_DESCRIPTIONS = {
  OWNER:
    'Full access to everything — billing, team, settings, and all data.',
  MANAGER:
    'Day-to-day operations. Everything except billing, team management, and business settings.',
  CASHIER:
    'Operate the POS, open and close their own shift, view products and customers.',
};

export const PERMISSIONS = {
  // ---------- Owner: everything ----------
  OWNER: ['*'],

  // ---------- Manager ----------
  MANAGER: [
    // Dashboard
    'dashboard.view',

    // POS & sales
    'pos.use',
    'sales.view',
    'sales.refund',
    'sales.export',

    // Shifts
    'shifts.view',
    'shifts.open',
    'shifts.close',

    // Catalogue
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'products.export',
    'categories.view',
    'categories.manage',

    // Inventory
    'inventory.view',
    'inventory.adjust',
    'inventory.export',

    // Customers
    'customers.view',
    'customers.create',
    'customers.edit',
    'customers.delete',
    'customers.credit',
    'customers.payment',
    'customers.statement',

    // Suppliers & purchases
    'suppliers.view',
    'suppliers.manage',
    'purchases.view',
    'purchases.create',
    'purchases.receive',
    'purchases.payment',

    // Reports & analytics
    'reports.view',
    'reports.export',
    'analytics.view',

    // Business settings (can see/edit business info, receipt, tax)
    'settings.update',

    // Subscription — view-only. Cannot upgrade or change plan.
    'subscription.view',

    // Account
    'notifications.view',
    'profile.edit',
    'help.view',
  ],

  // ---------- Cashier ----------
  CASHIER: [
    'pos.use',
    'sales.view.own',
    'shifts.view.own',
    'shifts.open',
    'shifts.close',
    'products.view',
    'categories.view',
    'inventory.view',
    'customers.view',
    'customers.create',
    'customers.credit',
    'notifications.view',
    'profile.edit',
    'help.view',
  ],
};

/**
 * Human-readable labels for the activity log.
 * Every action logged via activityLogService should have an entry here.
 */
export const ACTION_LABELS = {
  // Products
  'products.create': 'Created product',
  'products.update': 'Updated product',
  'products.delete': 'Deleted product',

  // Categories
  'categories.create': 'Created category',
  'categories.update': 'Updated category',
  'categories.delete': 'Deleted category',

  // Sales
  'sales.create': 'Completed sale',
  'sales.refund': 'Refunded order',

  // Shifts
  'shifts.open': 'Opened shift',
  'shifts.close': 'Closed shift',

  // Customers
  'customers.create': 'Created customer',
  'customers.update': 'Updated customer',
  'customers.delete': 'Deleted customer',
  'customers.payment': 'Recorded customer payment',

  // Purchases
  'purchases.create': 'Created purchase order',
  'purchases.receive': 'Received stock',
  'purchases.cancel': 'Cancelled purchase order',

  // Suppliers
  'suppliers.payment': 'Paid supplier',

  // Team
  'team.invite': 'Invited team member',
  'team.remove': 'Removed team member',
  'team.role-change': 'Changed team member role',

  // Auth
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',

  // Settings
  'settings.update': 'Updated settings',
  'subscription.change': 'Changed subscription',

  // System
  'system.log-cleared': 'Cleared activity log',
};

/**
 * Actions considered destructive — used by the Activity page's
 * quick-filter buttons and for visual highlighting.
 */
export const DESTRUCTIVE_ACTIONS = [
  'products.delete',
  'categories.delete',
  'customers.delete',
  'sales.refund',
  'purchases.cancel',
  'team.remove',
  'system.log-cleared',
];