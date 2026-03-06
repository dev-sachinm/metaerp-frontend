/**
 * Dynamic Permission System
 * Scalable architecture for handling 100s of entities and fields
 * Provides hooks for checking any permission at entity, action, or field level
 * Backend sends all permissions for every user (including superusers)
 */

import { usePermissions } from '@/stores/authStore'
import { useMemo } from 'react'

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
  
  if (!permissions) {
    return false
  }

  const entityPerms = permissions.entities?.[entity]
  if (!entityPerms) {
    return false
  }

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
    
    if (!permissions) {
      actions.forEach(action => {
        result[`can${action.charAt(0).toUpperCase() + action.slice(1)}`] = false
      })
      return result
    }

    const entityPerms = permissions.entities?.[entity]
    
    actions.forEach(action => {
      const key = `can${action.charAt(0).toUpperCase() + action.slice(1)}`
      result[key] = entityPerms?.[action] === true
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
  
  if (!permissions) {
    return false
  }

  const entityPerms = permissions.entities?.[entity]
  if (!entityPerms) {
    return false
  }

  // Check if any action is allowed
  // Note: Backend may not send 'list' field, so treat 'read' as allowing list
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
  
  if (!permissions) {
    return false
  }

  const fieldPerms = permissions.entities?.[entity]?.fields?.[fieldName]
  if (!fieldPerms) {
    return false
  }

  return fieldPerms.write === true
}

/**
 * Check if user can read a specific field
 * Usage: const canSeeSalary = useCanReadField('user', 'salary')
 */
export function useCanReadField(entity: string, fieldName: string): boolean {
  const permissions = usePermissions()
  
  if (!permissions) {
    return false
  }

  const fieldPerms = permissions.entities?.[entity]?.fields?.[fieldName]
  if (!fieldPerms) {
    return false
  }

  return fieldPerms.read === true
}

/**
 * Get all permissions for an entity
 * Usage: const userPerms = useEntityPermissions('user')
 */
export function useEntityPermissions(entity: string) {
  const permissions = usePermissions()
  
  if (!permissions) {
    return null
  }

  return permissions.entities?.[entity] ?? null
}

/**
 * Get all field-level permissions for an entity
 * Usage: const fields = useFieldPermissions('user')
 */
export function useFieldPermissions(entity: string) {
  const permissions = usePermissions()
  
  if (!permissions) {
    return null
  }

  return permissions.entities?.[entity]?.fields ?? null
}

/**
 * Get field access level (read, write, hidden, readonly)
 * Usage: const emailAccess = useFieldAccess('user', 'email')
 */
export function useFieldAccess(entity: string, fieldName: string): FieldAccessLevel | null {
  const permissions = usePermissions()
  
  if (!permissions) {
    return 'hidden'
  }

  const fieldPerms = permissions.entities?.[entity]?.fields?.[fieldName]
  if (!fieldPerms) {
    return 'hidden'
  }

  // Determine access level
  if (fieldPerms.write === true) {
    return 'write'
  } else if (fieldPerms.read === true) {
    return fieldPerms.write === false ? 'readonly' : 'read'
  }

  return 'hidden'
}

/**
 * Get accessible fields for an entity
 * Usage: const visibleFields = useAccessibleFields('user', 'read')
 * Returns array of field names user can access
 */
export function useAccessibleFields(
  entity: string,
  accessType: 'read' | 'write' = 'read'
): string[] {
  const permissions = usePermissions()
  
  return useMemo(() => {
    if (!permissions?.entities?.[entity]?.fields) {
      return []
    }

    const fields = permissions.entities[entity].fields
    
    return Object.keys(fields).filter(fieldName => {
      const fieldPerm = fields[fieldName]
      if (accessType === 'write') {
        return fieldPerm.write === true
      }
      return fieldPerm.read === true || fieldPerm.write === true
    })
  }, [permissions, entity, accessType])
}

/**
 * Normalize field name to camelCase for permission comparison (backend may use snake_case).
 * Use when matching readableFields from useAccessibleFields to GraphQL/camelCase field keys.
 */
export function toCamelCaseField(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Whether to show a list column for a field given the list of readable field names.
 * If readableFields is empty, no fields have the given permission → returns false (hide column).
 * Otherwise returns true only if fieldKey is in readableFields (camelCase-normalized).
 * Usage: canShowColumn(readableFields, 'contactInfo') when building list columns.
 */
export function canShowColumn(readableFields: string[], fieldKey: string): boolean {
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
 * Get all entity permissions as a usable object
 * Usage: const { canCreate, canList, canUpdate, canDelete } = useEntityActions('user')
 */
export function useEntityActions(entity: string) {
  const permissions = usePermissions()
  
  return useMemo(() => {
    if (!permissions?.entities?.[entity]) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canList: false,
      }
    }

    const entityPerms = permissions.entities[entity]
    
    return {
      canCreate: entityPerms.create === true,
      canRead: entityPerms.read === true,
      canUpdate: entityPerms.update === true,
      canDelete: entityPerms.delete === true,
      canList: entityPerms.list === true,
    }
  }, [permissions, entity])
}
