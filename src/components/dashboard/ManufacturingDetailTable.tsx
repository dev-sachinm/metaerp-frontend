import type { ManufacturingReceivedItem } from '@/hooks/graphql/useSuperadminDashboard'

interface ManufacturingDetailTableProps {
  items: ManufacturingReceivedItem[]
}

function receiveColorClass(pct: number): string {
  if (pct >= 80) return 'bg-emerald-100 text-emerald-700'
  if (pct >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export function ManufacturingDetailTable({ items }: ManufacturingDetailTableProps) {
  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        No manufacturing data found
      </div>
    )
  }

  return (
    <div className="overflow-auto max-h-72 rounded-lg border border-slate-100">
      <table className="w-full text-xs text-left">
        <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 font-semibold">Fixture</th>
            <th className="px-3 py-2 font-semibold">Project</th>
            <th className="px-3 py-2 font-semibold text-right">Mfg'd</th>
            <th className="px-3 py-2 font-semibold text-right">Rcv'd</th>
            <th className="px-3 py-2 font-semibold text-right">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.fixtureId} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2">
                <p className="font-medium text-slate-800">{item.fixtureNumber}</p>
                {item.fixtureDescription && (
                  <p className="text-slate-400 truncate max-w-[120px]">{item.fixtureDescription}</p>
                )}
              </td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{item.projectNumber}</td>
              <td className="px-3 py-2 text-right text-slate-700">{item.totalManufactured}</td>
              <td className="px-3 py-2 text-right text-slate-700">{item.receivedManufactured}</td>
              <td className="px-3 py-2 text-right">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full font-semibold ${receiveColorClass(item.receivedPercentage)}`}
                >
                  {item.receivedPercentage.toFixed(0)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
