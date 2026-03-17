/**
 * Protected Route Component
 * Wraps routes that require specific permissions
 */

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCanAccess } from '@/hooks/usePermissions'
import { useIsInitialized, usePermissions } from '@/stores/authStore'
import { Loader } from '@/components/Loader'

interface ProtectedRouteProps {
  entity: string
  action: 'create' | 'read' | 'update' | 'delete' | 'list'
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Route protection wrapper
 * Prevents access to pages user doesn't have permission for.
 *
 * IMPORTANT: does NOT redirect while permissions are still loading (null).
 * Only redirects once permissions have been fetched and the entity/action is
 * confirmed to be denied.
 *
 * @example
 * <ProtectedRoute entity="user" action="list">
 *   <UsersPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  entity,
  action,
  children,
  fallback,
}: ProtectedRouteProps) {
  const canAccess = useCanAccess(entity, action)
  const isInitialized = useIsInitialized()
  const permissions = usePermissions()

  // Still initialising auth state — wait, do not redirect yet
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="w-24 h-24">
          <Loader />
        </div>
      </div>
    )
  }

  // Permissions not yet fetched (e.g. myPermissions query still in-flight after
  // isInitialized was set).  Wait instead of redirecting to /unauthorized.
  if (permissions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="w-24 h-24">
          <Loader />
        </div>
      </div>
    )
  }

  // Permissions are loaded — evaluate access
  if (!canAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
