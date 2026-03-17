/**
 * Dynamic Permission System
 * Scalable architecture for handling 100s of entities and fields
 * Backend sends all permissions for every user (including superusers).
 * Entity names are the keys in myPermissions.byRole (GraphQL = source of truth);
 * we resolve UI entity names to that key so e.g. 'uom' matches backend 'unit_of_measure' when present.
 */

import { usePermissions } from '@/stores/authStore'
import { useMemo } from 'react'
import { resolvePermissionEntityKey } from '@/lib/permissionEntityKey'
import { UI_PERMISSIONS, type UIPermissionKey } from '@/config/uiPermissions'

/**
 * Permission action types
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'list'

/**
 * Field access levels
 */
export type FieldAccessLevel = 'read' | 'write' | 'hidden' | 'readonly'

/**
 * Check if user can perform an action on ANY entity (fully dynamic)
 * Usage: const canCreate = useCanAccess('user', 'create')
 * Works with any entity name from backend
 */
export function useCanAccess(
  entity: string,
  action: PermissionAction
): boolean {
  const permissions = usePermissions()
  if (!permissions?.entities) return false
  const key = resolvePermissionEntityKey(entity, permissions.entities)
  const entityPerms = permissions.entities[key]
  if (!entityPerms) return false
  return entityPerms[action] === true
}

/**
 * Check multiple permissions at once
 * Usage: const { canCreate, canUpdate } = useCanAccessMultiple('user', ['create', 'update'])
 */
export function useCanAccessMultiple(
  entity: string,
  actions: PermissionAction[]
): Record<string, boolean> {
  const permissions = usePermissions()
  
  return useMemo(() => {
    const result: Record<string, boolean> = {}
    const cap = (a: string) => `can${a.charAt(0).toUpperCase() + a.slice(1)}`
    actions.forEach(action => { result[cap(action)] = false })
    if (!permissions?.entities) return result
    const key = resolvePermissionEntityKey(entity, permissions.entities)
    const entityPerms = permissions.entities[key]
    actions.forEach(action => {
      result[cap(action)] = entityPerms?.[action] === true
    })
    return result
  }, [permissions, entity, actions])
}

/**
 * Check if user has access to an entire entity (any action)
 * Usage: const hasUserAccess = useHasEntityAccess('user')
 * Note: If 'list' is not present, treats 'read' as allowing list access
 */
export function useHasEntityAccess(entity: string): boolean {
  const permissions = usePermissions()
  if (!permissions?.entities) return false
  const key = resolvePermissionEntityKey(entity, permissions.entities)
  const entityPerms = permissions.entities[key]
  if (!entityPerms) return false
  const canList = entityPerms.list === true || entityPerms.read === true
  return (
    entityPerms.create === true ||
    entityPerms.read === true ||
    entityPerms.update === true ||
    entityPerms.delete === true ||
    canList
  )
}

/**
 * Get all entities user has access to
 * Usage: const accessibleEntities = useAccessibleEntities()
 * Note: If 'list' is not present, treats 'read' as allowing list access
 */
export function useAccessibleEntities(): string[] {
  const permissions = usePermissions()
  
  return useMemo(() => {
    if (!permissions?.entities) {
      return []
    }

    return Object.keys(permissions.entities).filter(entity => {
      const entityPerms = permissions.entities[entity]
      // Note: Backend may not send 'list' field, so treat 'read' as allowing list
      const canList = entityPerms.list === true || entityPerms.read === true
      
      return (
        entityPerms.create === true ||
        entityPerms.read === true ||
        entityPerms.update === true ||
        entityPerms.delete === true ||
        canList
      )
    })
  }, [permissions])
}

/**
 * Check if user can write to a specific field
 * Usage: const canEditSalary = useCanEditField('user', 'salary')
 */
export function useCanEditField(entity: string, fieldName: string): boolean {
  const permissions = usePermissions()
  if (!permissions?.entities) return false
  const key = resolvePermissionEntityKey(entity, permissions.entities)
  const fieldPerms = getFieldPerms(permissions.entities[key]?.fields, fieldName)
  return fieldPerms?.write === true
}

/**
 * Check if user can read a specific field
 * Usage: const canSeeSalary = useCanReadField('user', 'salary')
 */
export function useCanReadField(entity: string, fieldName: string): boolean {
  const permissions = usePermissions()
  if (!permissions?.entities) return false
  const key = resolvePermissionEntityKey(entity, permissions.entities)
  const fieldPerms = getFieldPerms(permissions.entities[key]?.fields, fieldName)
  return fieldPerms?.read === true
}

/**
 * Get all permissions for an entity
 * Usage: const userPerms = useEntityPermissions('user')
 */
export function useEntityPermissions(entity: string) {
  const permissions = usePermissions()
  if (!permissions?.entities) return null
  const key = resolvePermissionEntityKey(entity, permissions.entities)
  return permissions.entities[key] ?? null
}

/**
 * Get all field-level permissions for an entity
 * Usage: const fields = useFieldPermissions('user')
 */
export function useFieldPermissions(entity: string) {
  const permissions = usePermissions()
  if (!permissions?.entities) return null
  const key = resolvePermissionEntityKey(entity, permissions.entities)
  return permissions.entities[key]?.fields ?? null
}

/**
 * Get field access level (read, write, hidden, readonly)
 * Usage: const emailAccess = useFieldAccess('user', 'email')
 */
export function useFieldAccess(entity: string, fieldName: string): FieldAccessLevel | null {
  const permissions = usePermissions()
  if (!permissions?.entities) return 'hidden'
  const key = resolvePermissionEntityKey(entity, permissions.entities)
  const fieldPerms = getFieldPerms(permissions.entities[key]?.fields, fieldName)
  if (!fieldPerms) return 'hidden'

  // Determine access level
  if (fieldPerms.write === true) {
    return 'write'
  } else if (fieldPerms.read === true) {
    return fieldPerms.write === false ? 'readonly' : 'read'
  }

  return 'hidden'
}

/**
 * Get accessible fields for an entity.
 * Returns:
 *   null          — no field permissions configured for this entity; callers should show ALL fields (fallback)
 *   string[]      — field perms are configured; only listed fields are readable/writable
 *   [] (empty)    — field perms configured but none readable for this access type
 *
 * Usage: const visibleFields = useAccessibleFields('user', 'read')
 */
export function useAccessibleFields(
  entity: string,
  accessType: 'read' | 'write' = 'read'
): string[] | null {
  const permissions = usePermissions()
  return useMemo(() => {
    if (!permissions?.entities) return null
    const key = resolvePermissionEntityKey(entity, permissions.entities)
    const fields = permissions.entities[key]?.fields
    // No field permissions configured for this entity → null means "show all" fallback
    if (!fields || Object.keys(fields).length === 0) return null
    return getAccessibleFieldKeys(fields, accessType)
  }, [permissions, entity, accessType])
}

/** Get accessible field names (camelCase) for an entity so list and forms stay in sync with backend keys (camel or snake_case). */
function getAccessibleFieldKeys(
  fields: Record<string, { read?: boolean; write?: boolean }> | undefined,
  accessType: 'read' | 'write'
): string[] {
  if (!fields || typeof fields !== 'object') return []
  const keys: string[] = []
  for (const key of Object.keys(fields)) {
    const perm = fields[key]
    const can = accessType === 'write' ? perm?.write === true : (perm?.read === true || perm?.write === true)
    if (can) keys.push(toCamelCaseField(key))
  }
  return [...new Set(keys)]
}

/**
 * Normalize field name to camelCase for permission comparison (backend may use snake_case).
 * Use when matching readableFields from useAccessibleFields to GraphQL/camelCase field keys.
 */
export function toCamelCaseField(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** Convert camelCase to snake_case so we can look up backend keys (e.g. primaryContactName → primary_contact_name). */
function toSnakeCaseField(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/**
 * Resolve field permission from store; backend may use snake_case keys while forms use camelCase.
 * Tries fieldName then snake_case variant so list (normalized) and forms (camelCase) stay in sync.
 * Exported for registry form renderer (canEdit per field without calling useCanEditField in a loop).
 */
export function getFieldPerms(
  fields: Record<string, { read?: boolean; write?: boolean }> | undefined,
  fieldName: string
): { read?: boolean; write?: boolean } | undefined {
  if (!fields || typeof fields !== 'object') return undefined
  return fields[fieldName] ?? fields[toSnakeCaseField(fieldName)]
}

/**
 * Whether to show a list column or view-page field given the readable field names from useAccessibleFields.
 *
 * - null  → no field permissions configured → return true (show all, same fallback as sf()/sr() in forms)
 * - []    → field permissions configured but this role can read nothing → return false
 * - [...] → return true only when fieldKey is in the accessible list (camelCase-normalised)
 *
 * Usage: canShowColumn(readableFields, 'contactInfo') when building list columns.
 */
export function canShowColumn(readableFields: string[] | null, fieldKey: string): boolean {
  if (readableFields === null) return true  // no field perms configured → show all
  if (readableFields.length === 0) return false
  const normalized = readableFields.map(toCamelCaseField)
  return normalized.includes(fieldKey) || readableFields.includes(fieldKey)
}

/**
 * Check if field should be hidden in UI
 * Usage: const isHidden = useIsFieldHidden('user', 'salary')
 */
export function useIsFieldHidden(entity: string, fieldName: string): boolean {
  const fieldAccess = useFieldAccess(entity, fieldName)
  return fieldAccess === 'hidden' || fieldAccess === null
}

/**
 * Check if field should be readonly in UI
 * Usage: const isReadonly = useIsFieldReadonly('user', 'email')
 */
export function useIsFieldReadonly(entity: string, fieldName: string): boolean {
  const fieldAccess = useFieldAccess(entity, fieldName)
  return fieldAccess === 'readonly' || fieldAccess === 'read'
}

/**
 * Check whether a named UI action is permitted for the current user.
 * Maps action keys (e.g. 'UPLOAD_BOM') to backend entity+action and checks permissions.
 * Roles are never hardcoded — the backend controls access via myPermissions.byRole.
 *
 * Usage:
 *   const canUpload = useUIPermission('UPLOAD_BOM')
 *   {canUpload && <Button>Upload BOM</Button>}
 */
export function useUIPermission(key: UIPermissionKey): boolean {
  const { entity, action } = UI_PERMISSIONS[key]
  return useCanAccess(entity, action)
}

/**
 * Check multiple UI action permissions at once.
 * Usage:
 *   const { UPLOAD_BOM, EDIT_PROJECT } = useUIPermissions(['UPLOAD_BOM', 'EDIT_PROJECT'])
 */
export function useUIPermissions<K extends UIPermissionKey>(keys: K[]): Record<K, boolean> {
  const permissions = usePermissions()
  return useMemo(() => {
    const result = {} as Record<K, boolean>
    for (const key of keys) {
      const { entity, action } = UI_PERMISSIONS[key]
      if (!permissions?.entities) { result[key] = false; continue }
      const resolvedKey = resolvePermissionEntityKey(entity, permissions.entities)
      const entityPerms = permissions.entities[resolvedKey]
      result[key] = entityPerms?.[action] === true
    }
    return result
  }, [permissions, keys])
}

/**
 * Get all entity permissions as a usable object
 * Usage: const { canCreate, canList, canUpdate, canDelete } = useEntityActions('user')
 */
export function useEntityActions(entity: string) {
  const permissions = usePermissions()
  return useMemo(() => {
    const none = {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      canList: false,
    }
    if (!permissions?.entities) return none
    const key = resolvePermissionEntityKey(entity, permissions.entities)
    const entityPerms = permissions.entities[key]
    if (!entityPerms) return none
    return {
      canCreate: entityPerms.create === true,
      canRead: entityPerms.read === true,
      canUpdate: entityPerms.update === true,
      canDelete: entityPerms.delete === true,
      canList: entityPerms.list === true,
    }
  }, [permissions, entity])
}
