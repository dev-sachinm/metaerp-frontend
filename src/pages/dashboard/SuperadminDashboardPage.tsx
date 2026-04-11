import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { ProjectCompletionBarChart } from '@/components/dashboard/ProjectCompletionBarChart'
import { ManufacturingReceivedPieChart } from '@/components/dashboard/ManufacturingReceivedPieChart'
import { ManufacturingDetailTable } from '@/components/dashboard/ManufacturingDetailTable'
import { ProjectDeadlineTable } from '@/components/dashboard/ProjectDeadlineTable'
import { useSuperadminDashboard } from '@/hooks/graphql/useSuperadminDashboard'
import { useCurrentUser } from '@/stores/authStore'

export function SuperadminDashboardPage() {
  const user = useCurrentUser()

  // Role guard — redirect non-superadmins
  if (user && !user.roles.includes('superadmin')) {
    return <Navigate to="/unauthorized" replace />
  }

  const { completion, manufacturing, deadline, refetchAll } = useSuperadminDashboard()

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-screen-2xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Superadmin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Live overview of projects, manufacturing, and deadlines
            </p>
          </div>
          <button
            onClick={refetchAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh all
          </button>
        </div>

        {/* Row 1 — Project Completion (full width) */}
        <div className="mb-6">
          <DashboardCard
            title="Project Completion"
            loading={completion.loading}
            error={completion.error as Error | null}
            onRefresh={completion.refetch}
          >
            <ProjectCompletionBarChart
              items={completion.data?.items ?? []}
            />
          </DashboardCard>
        </div>

        {/* Row 2 — Manufacturing: Pie + Detail table (half + half) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DashboardCard
            title="Manufacturing Received"
            loading={manufacturing.loading}
            error={manufacturing.error as Error | null}
            onRefresh={manufacturing.refetch}
          >
            <ManufacturingReceivedPieChart
              items={manufacturing.data?.items ?? []}
            />
          </DashboardCard>

          <DashboardCard
            title="Manufacturing Detail"
            loading={manufacturing.loading}
            error={manufacturing.error as Error | null}
            onRefresh={manufacturing.refetch}
          >
            <ManufacturingDetailTable
              items={manufacturing.data?.items ?? []}
            />
          </DashboardCard>
        </div>

        {/* Row 3 — Deadline table (full width) */}
        <div>
          <DashboardCard
            title="Project Deadlines"
            loading={deadline.loading}
            error={deadline.error as Error | null}
            onRefresh={deadline.refetch}
          >
            <ProjectDeadlineTable
              items={deadline.data?.items ?? []}
              overdueCount={deadline.data?.overdueCount ?? 0}
              total={deadline.data?.total ?? 0}
            />
          </DashboardCard>
        </div>
      </div>
    </DashboardLayout>
  )
}
