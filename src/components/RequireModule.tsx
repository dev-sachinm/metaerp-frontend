/**
 * Route guard: only render children if the given module is enabled for the tenant.
 * When disabled, redirects to /module-not-enabled or home.
 * Use in combination with ProtectedRoute for permission checks.
 */

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useIsModuleEnabled, useModulesLoaded } from '@/stores/modulesStore'
import { useIsInitialized } from '@/stores/authStore'
import { Loader } from '@/components/Loader'

interface RequireModuleProps {
  moduleId: string
  children: ReactNode
  fallbackPath?: string
}

export function RequireModule({
  moduleId,
  children,
  fallbackPath = '/module-not-enabled',
}: RequireModuleProps) {
  const isEnabled = useIsModuleEnabled(moduleId)
  const modulesLoaded = useModulesLoaded()
  const isInitialized = useIsInitialized()

  if (!isInitialized || !modulesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <div className="mb-6">
            <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
          </div>
          <div className="flex justify-center mb-4">
            <Loader />
          </div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isEnabled) {
    return <Navigate to={fallbackPath} replace state={{ moduleId }} />
  }

  return <>{children}</>
}
