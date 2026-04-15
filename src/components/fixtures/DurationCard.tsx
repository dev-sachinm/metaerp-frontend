import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DurationCardProps {
  title: string
  icon?: React.ReactNode
  startDate: string | null | undefined
  endDate: string | null | undefined
  accentColor?: 'indigo' | 'teal' | 'violet'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function calcDurationDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

const colorMap = {
  indigo: {
    border: 'border-indigo-200',
    headerBg: 'bg-indigo-50',
    headerText: 'text-indigo-700',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    durationBg: 'bg-indigo-50',
    durationText: 'text-indigo-700',
    durationBorder: 'border-indigo-200',
  },
  teal: {
    border: 'border-teal-200',
    headerBg: 'bg-teal-50',
    headerText: 'text-teal-700',
    iconBg: 'bg-teal-100',
    iconText: 'text-teal-600',
    durationBg: 'bg-teal-50',
    durationText: 'text-teal-700',
    durationBorder: 'border-teal-200',
  },
  violet: {
    border: 'border-violet-200',
    headerBg: 'bg-violet-50',
    headerText: 'text-violet-700',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    durationBg: 'bg-violet-50',
    durationText: 'text-violet-700',
    durationBorder: 'border-violet-200',
  },
}

export function DurationCard({
  title,
  icon,
  startDate,
  endDate,
  accentColor = 'indigo',
}: DurationCardProps) {
  if (!startDate) return null

  const c = colorMap[accentColor]
  const durationDays =
    startDate && endDate ? calcDurationDays(startDate, endDate) : null

  return (
    <div className={`rounded-lg border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`flex items-center gap-2 px-3 py-2 ${c.headerBg}`}>
        {icon ?? <Clock className={`h-3.5 w-3.5 ${c.iconText}`} />}
        <span className={`text-xs font-semibold ${c.headerText}`}>{title}</span>
      </div>
      <div className="px-3 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-500">Start</span>
          <span className="text-xs font-medium text-slate-700">
            {formatDate(startDate)}
          </span>
        </div>

        <ArrowRight className="h-3 w-3 text-slate-300" />

        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-500">End</span>
          {endDate ? (
            <span className="text-xs font-medium text-slate-700">
              {formatDate(endDate)}
            </span>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
              In Progress
            </Badge>
          )}
        </div>

        {durationDays != null && (
          <>
            <span className="text-slate-200">|</span>
            <div className={`inline-flex items-center gap-1 text-xs font-semibold ${c.durationText} ${c.durationBg} border ${c.durationBorder} rounded-full px-2 py-0.5`}>
              <Clock className="h-3 w-3" />
              {durationDays} day{durationDays !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export { calcDurationDays }
