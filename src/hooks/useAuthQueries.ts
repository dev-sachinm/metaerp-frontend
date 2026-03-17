/**
 * React Query Hooks for Auth (GraphQL-based)
 * Handles data fetching, caching, and synchronization
 */

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useCurrentUser } from '@/hooks/graphql/useUsersQuery'
import { useMyPermissions, permissionKeys } from '@/hooks/graphql/usePermissionsQuery'
import { authService } from '@/services/authService'
import { useLogin as useGraphQLLogin } from '@/hooks/graphql/useAuthMutation'
import { User, PermissionsResponse } from '@/types/auth'
import { mergeByRoleToEntities, getRoleNamesFromByRole } from '@/lib/permissions'

/**
 * Convert currentUser / GraphQL user to Auth User format.
 * If permissions.byRole is present, roles are derived from its keys; else use user.roles if present.
 */
function convertGraphQLUserToAuthUser(graphqlUser: any, byRole?: Record<string, unknown> | null): User {
  const roles =
    getRoleNamesFromByRole(byRole as any).length > 0
      ? getRoleNamesFromByRole(byRole as any)
      : (graphqlUser.roles || [])
  return {
    id: graphqlUser.id,
    email: graphqlUser.email ?? graphqlUser.username ?? '',
    username: graphqlUser.username,
    is_active: graphqlUser.isActive ?? true,
    roles,
  }
}

/**
 * Convert myPermissions.byRole (or login.permissions.byRole) to PermissionsResponse (entities).
 */
function convertGraphQLPermissionsToAuth(graphqlPerms: { byRole?: any } | null | undefined): PermissionsResponse {
  return mergeByRoleToEntities(graphqlPerms?.byRole)
}

/**
 * Hook to fetch current user with permissions
 * Main hook for app initialization
 * - Fetches on mount if token exists
 * - Caches for 5 minutes
 * - Keeps data for 10 minutes in memory
 */
export function useAuth() {
  const { setUser, setPermissions } = useAuthStore()

  // Fetch current user
  const userQuery = useCurrentUser()

  // Fetch user permissions
  const permissionsQuery = useMyPermissions()

  // Sync store when user data arrives (derive roles from permissions.byRole if available)
  useEffect(() => {
    if (userQuery.data?.currentUser) {
      const byRole = permissionsQuery.data?.myPermissions?.byRole
      const convertedUser = convertGraphQLUserToAuthUser(userQuery.data.currentUser, byRole)
      setUser(convertedUser)
    }
  }, [userQuery.data?.currentUser, permissionsQuery.data?.myPermissions?.byRole, setUser])

  // Sync store when permissions arrive (myPermissions.byRole → entities)
  useEffect(() => {
    if (permissionsQuery.data?.myPermissions) {
      const convertedPerms = convertGraphQLPermissionsToAuth(permissionsQuery.data.myPermissions)
      setPermissions(convertedPerms)
    }
  }, [permissionsQuery.data?.myPermissions, setPermissions])

  return {
    isLoading: userQuery.isLoading || permissionsQuery.isLoading,
    isError: userQuery.isError || permissionsQuery.isError,
    error: userQuery.error || permissionsQuery.error,
    data: userQuery.data?.currentUser && permissionsQuery.data?.myPermissions
      ? {
          user: convertGraphQLUserToAuthUser(userQuery.data.currentUser, permissionsQuery.data.myPermissions.byRole),
          permissions: convertGraphQLPermissionsToAuth(permissionsQuery.data.myPermissions),
        }
      : null,
  }
}

/**
 * Hook to refresh user permissions from the backend.
 * Refetches myPermissions and syncs the result into the auth store so newly enabled
 * fields/entities appear without re-login.
 */
export function useRefreshPermissions() {
  const queryClient = useQueryClient()
  const { setPermissions } = useAuthStore()
  const [isPending, setIsPending] = useState(false)

  return {
    mutate: async () => {
      setIsPending(true)
      try {
        queryClient.invalidateQueries({ queryKey: permissionKeys.my() })
        await queryClient.refetchQueries({ queryKey: permissionKeys.my() })
        const queriesData = queryClient.getQueriesData<{ myPermissions: { byRole?: unknown } }>({
          queryKey: permissionKeys.my(),
        })
        const entry = queriesData.find(([, data]) => data?.myPermissions != null)
        if (entry?.[1]?.myPermissions) {
          const converted = convertGraphQLPermissionsToAuth(entry[1].myPermissions)
          setPermissions(converted)
        }
        toast.success('Permissions refreshed')
      } catch (error) {
        logger.error('Failed to refresh permissions', {
          category: 'technical',
          error,
        })
        toast.error('Failed to refresh permissions')
      } finally {
        setIsPending(false)
      }
    },
    isPending,
  }
}

/**
 * Hook for login mutation
 * Now uses GraphQL instead of REST
 */
export function useLogin() {
  // Use the GraphQL login mutation which handles everything
  return useGraphQLLogin()
}

/**
 * Hook for logout
 * Clears auth state and redirects to login
 */
export function useLogout() {
  const { logout: clearAuth } = useAuthStore()
  
  return {
    isPending: false,
    mutate: () => {
      authService.logout()
      clearAuth()
      toast.success('Logged out successfully')
      // Force redirect to login page
      window.location.href = '/login'
    },
  }
}
