/**
 * Field Guard Component
 * Controls visibility and editability of form fields based on permissions
 */

import { ReactNode } from 'react'
import { useCanReadField, useCanEditField } from '@/hooks/usePermissions'

interface FieldGuardProps {
  entity: string
  fieldName: string
  action: 'read' | 'write'
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Field-level permission guard
 * Hides/disables form fields based on permissions
 * 
 * @example
 * // Show field only if readable
 * <FieldGuard entity="user" fieldName="salary" action="read">
 *   <div>{user.salary}</div>
 * </FieldGuard>
 * 
 * // Show input only if writable
 * <FieldGuard entity="user" fieldName="email" action="write">
 *   <Input {...register('email')} />
 * </FieldGuard>
 */
export function FieldGuard({
  entity,
  fieldName,
  action,
  fallback = null,
  children,
}: FieldGuardProps) {
  const canRead = useCanReadField(entity, fieldName)
  const canWrite = useCanEditField(entity, fieldName)

  const hasPermission = action === 'read' ? canRead : canWrite

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
