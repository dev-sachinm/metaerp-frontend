import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { DeadlineItem, ProjectStatus } from '@/hooks/graphql/useSuperadminDashboard'

// ── Helpers ────────────────────────────────────────────────────────────────

function remainingDaysChip(days: number, isOverdue: boolean) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        Overdue {Math.abs(days)}d
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        {days}d left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      {days}d left
    </span>
  )
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  open: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
}

function formatDate(raw: string): string {
  try {
    return format(parseISO(raw), 'dd MMM yyyy')
  } catch {
    return raw
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ProjectDeadlineTableProps {
  items: DeadlineItem[]
  overdueCount: number
  total: number
}

export function ProjectDeadlineTable({ items, overdueCount, total }: ProjectDeadlineTableProps) {
  const navigate = useNavigate()
  const [overdueOnly, setOverdueOnly] = useState(false)

  const displayed = overdueOnly ? items.filter((i) => i.isOverdue) : items

  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        No deadline data found
      </div>
    )
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {overdueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {overdueCount} overdue
          </span>
        )}
        {total - overdueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            {total - overdueCount} on track
          </span>
        )}
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Show overdue only
        </label>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-slate-100">
        <table className="w-full text-xs text-left">
          <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 font-semibold">Project #</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Customer</th>
              <th className="px-3 py-2 font-semibold">Target Date</th>
              <th className="px-3 py-2 font-semibold text-right">Remaining</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayed.map((item) => (
              <tr
                key={item.projectId}
                onClick={() => navigate(`/projects/${item.projectId}/view`)}
                className={`cursor-pointer hover:bg-indigo-50 transition-colors ${
                  item.isOverdue ? 'bg-red-50/40' : ''
                }`}
              >
                <td className="px-3 py-2 font-medium text-indigo-700 whitespace-nowrap">
                  {item.projectNumber}
                </td>
                <td className="px-3 py-2 text-slate-800 max-w-[160px]">
                  <span className="truncate block">{item.name}</span>
                </td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{item.customerName}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                  {formatDate(item.targetDate)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {remainingDaysChip(item.remainingDays, item.isOverdue)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
