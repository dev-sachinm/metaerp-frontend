import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/Loader'
import { ClipboardList, ExternalLink } from 'lucide-react'
import { useUIPermission } from '@/hooks/usePermissions'

// ── GraphQL ───────────────────────────────────────────────────────────────────
const AUDIT_WIDGET_QUERY = `
  query AuditWidget($page: Int, $pageSize: Int) {
    auditLogs(page: $page, pageSize: $pageSize) {
      items {
        id timestamp userName action entityName entityLabel source
      }
      hasMore
      lastPage
    }
  }
`

interface AuditWidgetLog {
  id: string
  timestamp: string
  userName: string
  action: string
  entityName: string
  entityLabel?: string | null
  source?: string | null
}

// ── Action badge colours ──────────────────────────────────────────────────────
const ACTION_STYLE: Record<string, string> = {
  CREATE:            'bg-green-50 text-green-700 border-green-200',
  UPDATE:            'bg-blue-50 text-blue-700 border-blue-200',
  DELETE:            'bg-red-50 text-red-700 border-red-200',
  LOGIN:             'bg-indigo-50 text-indigo-700 border-indigo-200',
  EXPORT:            'bg-amber-50 text-amber-700 border-amber-200',
  UPLOAD:            'bg-teal-50 text-teal-700 border-teal-200',
  CONFIG:            'bg-orange-50 text-orange-700 border-orange-200',
  PERMISSION_CHANGE: 'bg-purple-50 text-purple-700 border-purple-200',
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Widget ────────────────────────────────────────────────────────────────────
export function AuditLogWidget() {
  const canViewAuditPage = useUIPermission('AUDIT_LOGS_MENU')
  const PAGE_SIZE = 10
  const [pages, setPages] = useState<AuditWidgetLog[][]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auditWidget', currentPage],
    queryFn: () =>
      executeGraphQL<{ auditLogs: { items: AuditWidgetLog[]; hasMore: boolean; lastPage: number } }>(
        AUDIT_WIDGET_QUERY,
        { page: currentPage, pageSize: PAGE_SIZE }
      ),
    staleTime: 30 * 1000,
  })

  // Accumulate pages
  useEffect(() => {
    if (!data?.auditLogs) return
    const { items, hasMore: more } = data.auditLogs
    setPages(prev => {
      const next = [...prev]
      next[currentPage - 1] = items
      return next
    })
    setHasMore(more)
    setLoadingMore(false)
  }, [data, currentPage])

  // Intersection observer — trigger next page when sentinel is visible
  const loadNext = useCallback(() => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    setCurrentPage(p => p + 1)
  }, [hasMore, loadingMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadNext() },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadNext])

  const allItems = pages.flat()

  return (
    <Card className="flex flex-col h-full max-h-[520px] overflow-hidden">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold text-slate-700">Recent Activity</CardTitle>
          </div>
          {canViewAuditPage && (
            <Link
              to="/audit-logs"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-3 pb-3 pt-0 space-y-0 scrollbar-thin">
        {isLoading && allItems.length === 0 ? (
          <div className="flex justify-center py-8"><Loader /></div>
        ) : isError ? (
          <p className="text-xs text-slate-400 text-center py-6">Could not load activity.</p>
        ) : allItems.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No recent activity.</p>
        ) : (
          <>
            {allItems.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-start gap-2.5 py-2.5 ${i < allItems.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                {/* Action badge */}
                <Badge
                  className={`text-[9px] px-1.5 py-0 border font-bold shrink-0 mt-0.5 ${ACTION_STYLE[log.action] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
                >
                  {log.action}
                </Badge>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 leading-snug">
                    <span className="font-medium">{log.userName}</span>
                    {' '}
                    <span className="text-slate-500 lowercase">{log.action.replace('_', ' ')}</span>
                    {' '}
                    <span className="font-medium">{log.entityLabel ?? log.entityName}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{log.entityName}</p>
                </div>

                {/* Time & Source */}
                <div className="flex flex-col items-end shrink-0 mt-0.5">
                  <span className="text-[10px] text-slate-400">
                    {relativeTime(log.timestamp)}
                  </span>
                  {log.source && (
                    <span className="text-[9px] text-slate-300 mt-0.5 uppercase tracking-wider">
                      {log.source}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="py-1 flex justify-center">
              {loadingMore && <Loader />}
              {!hasMore && allItems.length > 0 && (
                <p className="text-[10px] text-slate-300">All caught up</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
