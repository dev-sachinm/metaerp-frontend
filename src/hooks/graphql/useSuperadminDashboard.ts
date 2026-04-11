import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import {
  SUPERADMIN_PROJECT_COMPLETION_QUERY,
  SUPERADMIN_MANUFACTURING_RECEIVED_QUERY,
  SUPERADMIN_PROJECT_DEADLINE_QUERY,
} from '@/graphql/queries/superadminDashboard.queries'

// ── Types ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'

export interface ProjectCompletionItem {
  projectId: string
  projectNumber: string
  name: string
  customerName: string
  status: ProjectStatus
  totalFixtures: number
  completionPercentage: number
}

export interface ProjectCompletionResponse {
  superadminProjectCompletionChart: {
    total: number
    items: ProjectCompletionItem[]
  }
}

export interface ManufacturingReceivedItem {
  projectId: string
  projectNumber: string
  projectName: string
  fixtureId: string
  fixtureNumber: string
  fixtureDescription: string
  totalManufactured: number
  receivedManufactured: number
  receivedPercentage: number
}

export interface ManufacturingReceivedResponse {
  superadminManufacturingReceivedChart: {
    total: number
    items: ManufacturingReceivedItem[]
  }
}

export interface DeadlineItem {
  projectId: string
  projectNumber: string
  name: string
  customerName: string
  targetDate: string
  remainingDays: number
  status: ProjectStatus
  isOverdue: boolean
}

export interface ProjectDeadlineResponse {
  superadminProjectDeadlineTable: {
    total: number
    overdueCount: number
    items: DeadlineItem[]
  }
}

// ── Query keys ─────────────────────────────────────────────────────────────

export const superadminDashboardKeys = {
  all: ['superadminDashboard'] as const,
  completion: () => [...superadminDashboardKeys.all, 'completion'] as const,
  manufacturing: () => [...superadminDashboardKeys.all, 'manufacturing'] as const,
  deadline: () => [...superadminDashboardKeys.all, 'deadline'] as const,
}

const POLL_INTERVAL_MS = 60_000

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useProjectCompletionChart() {
  return useQuery({
    queryKey: superadminDashboardKeys.completion(),
    queryFn: () => executeGraphQL<ProjectCompletionResponse>(SUPERADMIN_PROJECT_COMPLETION_QUERY),
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

export function useManufacturingReceivedChart() {
  return useQuery({
    queryKey: superadminDashboardKeys.manufacturing(),
    queryFn: () => executeGraphQL<ManufacturingReceivedResponse>(SUPERADMIN_MANUFACTURING_RECEIVED_QUERY),
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

export function useProjectDeadlineTable() {
  return useQuery({
    queryKey: superadminDashboardKeys.deadline(),
    queryFn: () => executeGraphQL<ProjectDeadlineResponse>(SUPERADMIN_PROJECT_DEADLINE_QUERY),
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

/** Composite hook — fires all three queries in parallel */
export function useSuperadminDashboard() {
  const completion = useProjectCompletionChart()
  const manufacturing = useManufacturingReceivedChart()
  const deadline = useProjectDeadlineTable()

  return {
    completion: {
      data: completion.data?.superadminProjectCompletionChart,
      loading: completion.isLoading,
      error: completion.error,
      refetch: completion.refetch,
    },
    manufacturing: {
      data: manufacturing.data?.superadminManufacturingReceivedChart,
      loading: manufacturing.isLoading,
      error: manufacturing.error,
      refetch: manufacturing.refetch,
    },
    deadline: {
      data: deadline.data?.superadminProjectDeadlineTable,
      loading: deadline.isLoading,
      error: deadline.error,
      refetch: deadline.refetch,
    },
    loading: completion.isLoading || manufacturing.isLoading || deadline.isLoading,
    refetchAll: () => {
      completion.refetch()
      manufacturing.refetch()
      deadline.refetch()
    },
  }
}
