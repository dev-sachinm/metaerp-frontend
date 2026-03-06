/**
 * Protected Route Component
 * Wraps routes that require specific permissions
 */

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCanAccess } from '@/hooks/usePermissions'
import { useIsInitialized } from '@/stores/authStore'

interface ProtectedRouteProps {
  entity: string
  action: 'create' | 'read' | 'update' | 'delete' | 'list'
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Route protection wrapper
 * Prevents access to pages user doesn't have permission for
 * 
 * @example
 * <Route
 *   path="/users"
 *   element={
 *     <ProtectedRoute entity="user" action="list">
 *       <UsersPage />
 *     </ProtectedRoute>
 *   }
 * />
 */
export function ProtectedRoute({
  entity,
  action,
  children,
  fallback,
}: ProtectedRouteProps) {
  const canAccess = useCanAccess(entity, action)
  const isInitialized = useIsInitialized()

  // Still loading auth data
  if (!isInitialized) {
    return <div>Loading...</div>
  }

  // No permission - show fallback or redirect
  if (!canAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
