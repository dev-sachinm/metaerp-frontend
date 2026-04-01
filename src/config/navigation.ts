/**
 * Central navigation and entity config: single source for menus and module/entity mapping.
 * Filter by enabled modules first, then by entity permissions (useHasEntityAccess).
 * See FRONTEND_ACCESS_AND_MODULES.md.
 */

export interface NavItemConfig {
  /** Backend module id (e.g. core, master_data) */
  moduleId: string
  /** Entity name for permission check; omit for non-entity links (e.g. Dashboard) */
  entity?: string
  path: string
  label: string
  /** If set, user must have THIS specific action (not just any) on the entity */
  requiredAction?: 'create' | 'read' | 'update' | 'delete' | 'list'
  /** Icon component or name for sidebar */
  icon?: 'dashboard' | 'users' | 'roles' | 'master' | 'project' | 'email' | 'audit' | 'purchase_order'
}

/** All nav items; order and visibility driven by module + permission */
export const NAV_ITEMS: NavItemConfig[] = [
  {
    moduleId: 'core',
    path: '/',
    label: 'Dashboard',
    icon: 'dashboard',
  },
  {
    moduleId: 'core',
    entity: 'user',
    path: '/users',
    label: 'Users',
    icon: 'users',
  },
  {
    moduleId: 'core',
    entity: 'role',
    path: '/roles',
    label: 'Roles & Permissions',
    icon: 'roles',
  },
  {
    moduleId: 'master_data',
    path: '/master',
    label: 'Master Data',
    icon: 'master',
  },
  {
    moduleId: 'project_management',
    entity: 'project',
    path: '/projects',
    label: 'Projects',
    icon: 'project',
  },
  {
    moduleId: 'master_data',
    entity: 'purchase_order',
    path: '/purchase-orders',
    label: 'Purchase Orders',
    icon: 'purchase_order',
  },
  {
    moduleId: 'core',
    entity: 'audit_log',
    requiredAction: 'delete',
    path: '/audit-logs',
    label: 'Audit Logs',
    icon: 'audit',
  },
]

/** Module IDs that own routes; use with RequireModule */
export const ROUTE_MODULE_MAP: Record<string, string> = {
  '/': 'core',
  '/users': 'core',
  '/users/create': 'core',
  '/users/:id/access': 'core',
  '/users/:id/edit': 'core',
  '/users/:id/change-password': 'core',
  '/roles': 'core',
  '/roles/:id/permissions': 'core',
  '/master': 'master_data',
  '/master/customers': 'master_data',
  '/master/products': 'master_data',
  '/master/product-categories': 'master_data',
  '/master/uom': 'master_data',
  '/master/tax': 'master_data',
  '/master/payment-terms': 'master_data',
  '/master/expense-categories': 'master_data',
  '/master/suppliers': 'master_data',
  '/master/vendors': 'master_data',
  '/purchase-orders': 'master_data',
  '/purchase-orders/:id/view': 'master_data',
  '/purchase-orders/:id/edit': 'master_data',
  '/projects': 'project_management',
  '/projects/:id/assignment': 'project_management',
  '/emails': 'core',
  '/emails/:id': 'core',
  '/audit-logs': 'core',
}

/** Resolve which module guards a path (first segment match) */
export function getModuleIdForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (ROUTE_MODULE_MAP[normalized]) return ROUTE_MODULE_MAP[normalized]
  if (normalized.startsWith('/users')) return 'core'
  if (normalized.startsWith('/roles')) return 'core'
  if (normalized.startsWith('/master')) return 'master_data'
  if (normalized.startsWith('/purchase-orders')) return 'master_data'
  if (normalized.startsWith('/projects')) return 'project_management'
  if (normalized.startsWith('/audit-logs')) return 'core'
  return null
}
