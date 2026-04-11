import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type { ProjectCompletionItem, ProjectStatus } from '@/hooks/graphql/useSuperadminDashboard'

// ── Status colours ──────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ProjectStatus, string> = {
  open: '#6366f1',        // indigo
  in_progress: '#f59e0b', // amber
  completed: '#10b981',   // emerald
  on_hold: '#94a3b8',     // slate
  cancelled: '#ef4444',   // red
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
}

// ── Custom tooltip ──────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  payload: ProjectCompletionItem
}

function CompletionTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
      <p className="text-slate-500">{d.customerName}</p>
      <div className="flex items-center gap-2 mt-1">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: STATUS_COLOR[d.status] }}
        />
        <span className="text-slate-600">{STATUS_LABEL[d.status]}</span>
      </div>
      <p className="text-slate-600">
        Fixtures: <span className="font-medium text-slate-800">{d.totalFixtures}</span>
      </p>
      <p className="text-slate-600">
        Completion:{' '}
        <span className="font-medium text-slate-800">{d.completionPercentage.toFixed(1)}%</span>
      </p>
    </div>
  )
}

// ── Legend ──────────────────────────────────────────────────────────────────

function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {(Object.keys(STATUS_COLOR) as ProjectStatus[]).map((s) => (
        <div key={s} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: STATUS_COLOR[s] }}
          />
          {STATUS_LABEL[s]}
        </div>
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface ProjectCompletionBarChartProps {
  items: ProjectCompletionItem[]
}

const BAR_HEIGHT = 36
const MIN_CHART_HEIGHT = 160

export function ProjectCompletionBarChart({ items }: ProjectCompletionBarChartProps) {
  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        No active projects found
      </div>
    )
  }

  const chartHeight = Math.max(MIN_CHART_HEIGHT, items.length * BAR_HEIGHT + 40)

  return (
    <div>
      <StatusLegend />
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={items}
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="projectNumber"
            width={80}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CompletionTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="completionPercentage" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {items.map((entry) => (
              <Cell key={entry.projectId} fill={STATUS_COLOR[entry.status]} />
            ))}
            <LabelList
              dataKey="completionPercentage"
              position="right"
              formatter={(v: unknown) => (typeof v === 'number' ? `${v.toFixed(0)}%` : '')}
              style={{ fontSize: 11, fill: '#64748b' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
