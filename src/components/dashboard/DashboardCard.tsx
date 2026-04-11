import { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface DashboardCardProps {
  title: string
  children: ReactNode
  loading?: boolean
  error?: Error | null
  onRefresh?: () => void
  className?: string
}

function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}

export function DashboardCard({
  title,
  children,
  loading,
  error,
  onRefresh,
  className = '',
}: DashboardCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 tracking-wide uppercase">{title}</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-5">
        {error ? (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
            <p className="text-sm font-medium text-red-600">Failed to load data</p>
            <p className="text-xs text-slate-500">{error.message}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="mt-2 text-xs text-indigo-600 hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="space-y-3 py-2">
            <SkeletonBar className="h-4 w-3/4" />
            <SkeletonBar className="h-4 w-1/2" />
            <SkeletonBar className="h-32 w-full" />
            <SkeletonBar className="h-4 w-2/3" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
