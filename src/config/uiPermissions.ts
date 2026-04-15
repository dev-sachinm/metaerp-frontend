/**
 * UI Action → Backend Permission mapping.
 * Single source of truth for which backend entity+action gates each UI button/action.
 *
 * Rules:
 * - Never check role names in components. Check UI_PERMISSIONS keys instead.
 * - When a new role is added on the backend, grant the right entity permissions there.
 *   The frontend automatically shows/hides actions with zero code changes.
 * - When a new UI action is added, add one entry here and use useUIPermission() in the component.
 */

import type { PermissionAction } from '@/hooks/usePermissions'

interface UIPermissionDef {
  entity: string
  action: PermissionAction
}

export const UI_PERMISSIONS = {
  // ── Project ──────────────────────────────────────────────────────────────────
  CREATE_PROJECT:      { entity: 'project', action: 'create' },
  EDIT_PROJECT:        { entity: 'project', action: 'update' },
  DELETE_PROJECT:      { entity: 'project', action: 'delete' },
  VIEW_PROJECT:        { entity: 'project', action: 'read'   },

  // ── BOM / Fixtures ────────────────────────────────────────────────────────
  UPLOAD_BOM:          { entity: 'fixture', action: 'create' },
  VIEW_BOM:            { entity: 'fixture', action: 'read'   },

  // ── Purchase orders (BOM: create manufacturing / standard PO) ─────────────
  /** Requires `purchase_order.create` on backend (procurement). */
  CREATE_PURCHASE_ORDER_PO: { entity: 'purchase_order', action: 'create' },

  /** Store / QA: receive standard parts, received LH/RH, bulk mfg status, unit price — uses `fixture.update`. */
  MANAGE_BOM_RECEIVING: { entity: 'fixture', action: 'update' },

  // ── Project Assignments ───────────────────────────────────────────────────
  ASSIGN_PROJECT:      { entity: 'project_assignment', action: 'update' },

  // ── Users ─────────────────────────────────────────────────────────────────
  CREATE_USER:         { entity: 'user', action: 'create' },
  EDIT_USER:           { entity: 'user', action: 'update' },
  DELETE_USER:         { entity: 'user', action: 'delete' },

  // ── Roles ─────────────────────────────────────────────────────────────────
  MANAGE_ROLE_PERMS:   { entity: 'role', action: 'update' },
  DELETE_ROLE:         { entity: 'role', action: 'delete' },

  // ── Dynamic Custom Checks ───────────────────────────────────────────────────
  // These are special cases where we want to dynamically check a string rather than a hardcoded enum.
  // They should be resolved using `useCanAccess` instead of `useUIPermission`.
  
  // ── Master Data (generic — entity-level create/update/delete) ─────────────
  CREATE_CUSTOMER:     { entity: 'customer',         action: 'create' },
  EDIT_CUSTOMER:       { entity: 'customer',         action: 'update' },
  DELETE_CUSTOMER:     { entity: 'customer',         action: 'delete' },
  CREATE_PRODUCT:      { entity: 'product',          action: 'create' },
  EDIT_PRODUCT:        { entity: 'product',          action: 'update' },
  DELETE_PRODUCT:      { entity: 'product',          action: 'delete' },
  CREATE_SUPPLIER:     { entity: 'supplier',         action: 'create' },
  EDIT_SUPPLIER:       { entity: 'supplier',         action: 'update' },
  DELETE_SUPPLIER:     { entity: 'supplier',         action: 'delete' },
  CREATE_VENDOR:       { entity: 'vendor',           action: 'create' },
  EDIT_VENDOR:         { entity: 'vendor',           action: 'update' },
  DELETE_VENDOR:       { entity: 'vendor',           action: 'delete' },

  // ── Audit Logs ──────────────────────────────────────────────────────────────
  /** Full audit page in sidebar — requires delete permission (admin-level only). */
  AUDIT_LOGS_MENU:     { entity: 'audit_log', action: 'delete' },
  /** Dashboard widget — requires only read permission. */
  AUDIT_LOGS_WIDGET:   { entity: 'audit_log', action: 'read'   },
} satisfies Record<string, UIPermissionDef>

export type UIPermissionKey = keyof typeof UI_PERMISSIONS
