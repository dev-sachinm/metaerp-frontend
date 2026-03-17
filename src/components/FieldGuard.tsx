/**
 * Field Guard Component
 * Controls visibility and editability of form fields based on permissions.
 *
 * action="read"  → visible if canRead OR canWrite (write implies read)
 * action="write" → visible only if canWrite
 *
 * When no field permissions are configured on the backend for this entity,
 * canRead and canWrite both return false — in that case we fall back to showing
 * the field (no field-level config = no restriction).
 */

import { ReactNode } from 'react'
import { useCanReadField, useCanEditField, useFieldPermissions } from '@/hooks/usePermissions'

interface FieldGuardProps {
  entity: string
  fieldName: string
  action: 'read' | 'write'
  fallback?: ReactNode
  children: ReactNode
}

export function FieldGuard({
  entity,
  fieldName,
  action,
  fallback = null,
  children,
}: FieldGuardProps) {
  const fieldPerms = useFieldPermissions(entity)
  const canRead = useCanReadField(entity, fieldName)
  const canWrite = useCanEditField(entity, fieldName)

  // No field-level permissions configured for this entity → show all fields
  if (!fieldPerms || Object.keys(fieldPerms).length === 0) {
    return <>{children}</>
  }

  const hasPermission = action === 'write' ? canWrite : (canRead || canWrite)

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
