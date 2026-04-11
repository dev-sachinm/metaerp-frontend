import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ManufacturingReceivedItem } from '@/hooks/graphql/useSuperadminDashboard'

// ── Colour helper ───────────────────────────────────────────────────────────

function receiveColor(pct: number): string {
  if (pct >= 80) return '#10b981' // emerald
  if (pct >= 40) return '#f59e0b' // amber
  return '#ef4444'                // red
}

// ── Custom tooltip ──────────────────────────────────────────────────────────

interface TooltipEntry {
  payload: ManufacturingReceivedItem
}

function ManufacturingTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipEntry[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1 min-w-[200px]">
      <p className="font-semibold text-slate-800 text-sm">
        {d.fixtureNumber}
      </p>
      {d.fixtureDescription && (
        <p className="text-slate-500 truncate max-w-[200px]">{d.fixtureDescription}</p>
      )}
      <p className="text-slate-500">{d.projectNumber} — {d.projectName}</p>
      <p className="text-slate-600">
        Manufactured: <span className="font-medium text-slate-800">{d.totalManufactured}</span>
      </p>
      <p className="text-slate-600">
        Received:{' '}
        <span className="font-medium text-slate-800">
          {d.receivedManufactured} ({d.receivedPercentage.toFixed(1)}%)
        </span>
      </p>
    </div>
  )
}

// ── Centre label ─────────────────────────────────────────────────────────────

interface CenterLabelProps {
  cx?: number
  cy?: number
  overallPct: number
}

function CenterLabel({ cx = 0, cy = 0, overallPct }: CenterLabelProps) {
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-slate-800" style={{ fontSize: 22, fontWeight: 700 }}>
        {overallPct.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11 }}>
        Overall Received
      </text>
    </g>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ManufacturingReceivedPieChartProps {
  items: ManufacturingReceivedItem[]
}

export function ManufacturingReceivedPieChart({ items }: ManufacturingReceivedPieChartProps) {
  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        No manufacturing data found
      </div>
    )
  }

  const totalMfg = items.reduce((s, i) => s + i.totalManufactured, 0)
  const totalRcv = items.reduce((s, i) => s + i.receivedManufactured, 0)
  const overallPct = totalMfg > 0 ? (totalRcv / totalMfg) * 100 : 0

  const legendItems = items.map((i) => ({
    value: `${i.fixtureNumber} (${i.projectNumber})`,
    color: receiveColor(i.receivedPercentage),
  }))

  return (
    <div>
      {/* Donut */}
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={items}
            dataKey="totalManufactured"
            nameKey="fixtureNumber"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            cx="50%"
            cy="50%"
          >
            {items.map((entry) => (
              <Cell key={entry.fixtureId} fill={receiveColor(entry.receivedPercentage)} />
            ))}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <CenterLabel overallPct={overallPct} cx={undefined as any} cy={undefined as any} />
          </Pie>
          <Tooltip content={<ManufacturingTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Colour legend */}
      <div className="flex gap-4 justify-center mt-1 mb-3">
        {[
          { label: '≥ 80%', color: '#10b981' },
          { label: '40–79%', color: '#f59e0b' },
          { label: '< 40%', color: '#ef4444' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Fixture legend chips */}
      <div className="flex flex-wrap gap-2 mt-2 max-h-28 overflow-y-auto">
        {legendItems.map(({ value, color }) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border"
            style={{ borderColor: color, color: color }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}
