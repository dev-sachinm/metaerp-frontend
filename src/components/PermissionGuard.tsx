/**
 * Permission Guard Components
 * Conditionally render content based on permissions
 */

import { ReactNode } from 'react'
import { useCanAccess } from '@/hooks/usePermissions'

interface PermissionGuardProps {
  entity: string
  action: 'create' | 'read' | 'update' | 'delete' | 'list'
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Entity-level permission guard
 * Hides content if user doesn't have permission
 * 
 * @example
 * <PermissionGuard entity="user" action="create" fallback={<p>No permission</p>}>
 *   <Button>Create User</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  entity,
  action,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const canAccess = useCanAccess(entity, action)

  if (!canAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
