/**
 * React Query hook for enabled modules; syncs result to modules store.
 * Call when app loads (after auth or when tenant is known) and when tenant changes.
 */

import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { GET_ENABLED_MODULES } from '@/graphql/queries/modules.queries'
import type { EnabledModulesResponse } from '@/types/modules'
import { useModulesStore } from '@/stores/modulesStore'
import { useEffect } from 'react'

export const modulesQueryKeys = {
  all: ['modules'] as const,
  enabled: () => [...modulesQueryKeys.all, 'enabled'] as const,
}

/**
 * Fetch enabled modules and sync to modules store.
 * No auth required.
 * Enable when we have a tenant (e.g. after login or when tenant selector is set).
 */
export function useEnabledModulesQuery(options?: { enabled?: boolean }) {
  const setModules = useModulesStore((s) => s.setModules)
  const query = useQuery({
    queryKey: modulesQueryKeys.enabled(),
    queryFn: async () => {
      const data = await executeGraphQL<EnabledModulesResponse>(GET_ENABLED_MODULES)
      return data
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled !== false,
  })

  useEffect(() => {
    if (query.data?.enabledModules) {
      setModules(query.data.enabledModules)
    }
  }, [query.data?.enabledModules, setModules])

  return query
}
