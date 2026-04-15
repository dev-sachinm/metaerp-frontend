import { motion } from 'framer-motion'
import { Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FixtureStageInfo, FixtureStageDisplayStatus } from '@/types/design'

export interface StageDurationInfo {
  stage: string
  durationDays: number | null
  label?: string
}

interface StageProgressBarProps {
  stageInfo: FixtureStageInfo[]
  compact?: boolean
  stageDurations?: StageDurationInfo[]
  openStageDate?: string | null
}

function formatStageDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${timePart}`
}

const stageColors: Record<FixtureStageDisplayStatus, {
  bg: string
  border: string
  text: string
  dot: string
  line: string
  dateBg: string
  dateText: string
}> = {
  completed: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-500',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500 shadow-emerald-500/40',
    line: 'bg-emerald-500',
    dateBg: 'bg-emerald-50',
    dateText: 'text-emerald-600',
  },
  current: {
    bg: 'bg-amber-400',
    border: 'border-amber-400',
    text: 'text-amber-700',
    dot: 'bg-amber-400 shadow-amber-400/50',
    line: 'bg-slate-200',
    dateBg: 'bg-amber-50',
    dateText: 'text-amber-600',
  },
  pending: {
    bg: 'bg-slate-200',
    border: 'border-slate-200',
    text: 'text-slate-400',
    dot: 'bg-slate-200 shadow-none',
    line: 'bg-slate-200',
    dateBg: 'bg-slate-50',
    dateText: 'text-slate-400',
  },
}

export function StageProgressBar({ stageInfo, compact = false, stageDurations, openStageDate }: StageProgressBarProps) {
  if (!stageInfo || stageInfo.length === 0) return null

  const durationMap = new Map(
    (stageDurations ?? []).map(d => [d.stage, d])
  )

  const displayStages: FixtureStageInfo[] = openStageDate !== undefined
    ? [{ stage: 'open', label: 'Open', displayStatus: 'completed', enteredAt: openStageDate ?? null }, ...stageInfo]
    : stageInfo

  return (
    <div className={cn('w-full', compact ? 'py-1' : 'py-3')}>
      <div className="relative flex items-start justify-between">
        {/* Connector line (behind the dots) */}
        <div className="absolute top-[18px] left-0 right-0 h-[3px] mx-[20px]">
          <div className="relative h-full w-full rounded-full bg-slate-100">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              initial={{ width: '0%' }}
              animate={{ width: getProgressWidth(displayStages) }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {displayStages.map((stage, idx) => {
          const colors = stageColors[stage.displayStatus]
          const dateStr = formatStageDate(stage.enteredAt)
          const isFirst = idx === 0
          const isLast = idx === displayStages.length - 1
          const duration = durationMap.get(stage.stage)

          return (
            <div
              key={stage.stage}
              className={cn(
                'relative flex flex-col items-center z-10',
                'flex-1 min-w-0',
                isFirst && 'items-start',
                isLast && 'items-end',
              )}
            >
              {/* Date label on top */}
              <div className={cn(
                'mb-1.5 h-5 flex items-center',
                isFirst && 'self-start',
                isLast && 'self-end',
                !isFirst && !isLast && 'self-center',
              )}>
                {dateStr ? (
                  <motion.span
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={cn(
                      'text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-md',
                      colors.dateBg, colors.dateText,
                    )}
                  >
                    {dateStr}
                  </motion.span>
                ) : (
                  <span className="text-[10px] text-transparent select-none">—</span>
                )}
              </div>

              {/* Stage dot / icon */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.06, duration: 0.35, type: 'spring', stiffness: 300 }}
                className={cn(
                  'relative flex items-center justify-center rounded-full transition-all',
                  stage.displayStatus === 'completed' && 'h-[22px] w-[22px]',
                  stage.displayStatus === 'current' && 'h-[26px] w-[26px]',
                  stage.displayStatus === 'pending' && 'h-[18px] w-[18px]',
                )}
              >
                {stage.displayStatus === 'current' && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-amber-400/30"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                <span
                  className={cn(
                    'relative flex items-center justify-center rounded-full shadow-md',
                    stage.displayStatus === 'completed' && 'h-[22px] w-[22px]',
                    stage.displayStatus === 'current' && 'h-[26px] w-[26px]',
                    stage.displayStatus === 'pending' && 'h-[18px] w-[18px]',
                    colors.dot,
                  )}
                >
                  {stage.displayStatus === 'completed' && (
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  )}
                  {stage.displayStatus === 'current' && (
                    <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
                  )}
                </span>
              </motion.div>

              {/* Stage label */}
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 + 0.1, duration: 0.3 }}
                className={cn(
                  'mt-1.5 text-[10px] leading-tight font-medium text-center max-w-[80px] break-words',
                  colors.text,
                  stage.displayStatus === 'current' && 'font-bold',
                  isFirst && 'text-left',
                  isLast && 'text-right',
                )}
              >
                {stage.label}
              </motion.span>

              {/* Duration badge (e.g. CMM duration) */}
              {duration && duration.durationDays != null && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.06 + 0.2, duration: 0.3 }}
                  className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded px-1 py-px"
                >
                  <Clock className="h-2.5 w-2.5" />
                  {duration.durationDays}d
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getProgressWidth(stageInfo: FixtureStageInfo[]): string {
  if (stageInfo.length <= 1) return '0%'
  const currentIdx = stageInfo.findIndex(s => s.displayStatus === 'current')
  const lastCompletedIdx = stageInfo.reduce(
    (acc, s, i) => (s.displayStatus === 'completed' ? i : acc),
    -1,
  )

  const activeIdx = currentIdx >= 0 ? currentIdx : lastCompletedIdx
  if (activeIdx < 0) return '0%'

  if (activeIdx >= stageInfo.length - 1) return '100%'
  const pct = (activeIdx / (stageInfo.length - 1)) * 100
  return `${pct}%`
}

/** Compact inline variant for list rows — shows just dots + current label */
export function StageProgressDots({ stageInfo, openStageDate }: { stageInfo: FixtureStageInfo[]; openStageDate?: string | null }) {
  if (!stageInfo || stageInfo.length === 0) return null

  const displayStages: FixtureStageInfo[] = openStageDate !== undefined
    ? [{ stage: 'open', label: 'Open', displayStatus: 'completed', enteredAt: openStageDate ?? null }, ...stageInfo]
    : stageInfo

  const currentStage = displayStages.find(s => s.displayStatus === 'current')

  return (
    <div className="flex items-center gap-1">
      {displayStages.map((s) => (
        <span
          key={s.stage}
          className={cn(
            'rounded-full transition-all',
            s.displayStatus === 'completed' && 'h-2 w-2 bg-emerald-500',
            s.displayStatus === 'current' && 'h-2.5 w-2.5 bg-amber-400 ring-2 ring-amber-200',
            s.displayStatus === 'pending' && 'h-1.5 w-1.5 bg-slate-200',
          )}
          title={`${s.label}${s.enteredAt ? ` — ${new Date(s.enteredAt).toLocaleString()}` : ''}`}
        />
      ))}
      {currentStage && (
        <span className="ml-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
          {currentStage.label}
        </span>
      )}
    </div>
  )
}
