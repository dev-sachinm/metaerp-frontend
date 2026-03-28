import { useState } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import {
  Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronDown, ChevronRight as ChevronRightSm,
} from 'lucide-react'

// ── GraphQL ───────────────────────────────────────────────────────────────────
const AUDIT_LOGS_QUERY = `
  query GetAuditLogs(
    $page: Int
    $pageSize: Int
    $userNameContains: String
    $action: String
    $entityName: String
    $entityId: String
    $fieldName: String
    $oldValueContains: String
    $newValueContains: String
    $fromDate: String
    $toDate: String
  ) {
    auditLogs(
      page: $page
      pageSize: $pageSize
      userNameContains: $userNameContains
      action: $action
      entityName: $entityName
      entityId: $entityId
      fieldName: $fieldName
      oldValueContains: $oldValueContains
      newValueContains: $newValueContains
      fromDate: $fromDate
      toDate: $toDate
    ) {
      total page totalPages hasMore firstPage lastPage
      items {
        id timestamp userId userName action
        entityName entityId entityLabel ipAddress
        changes { field oldValue newValue }
      }
    }
  }
`

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditChange { field: string; oldValue?: string | null; newValue?: string | null }
interface AuditLog {
  id: string; timestamp: string; userId: string; userName: string
  action: string; entityName: string; entityId: string
  entityLabel?: string | null; ipAddress?: string | null
  changes?: AuditChange[] | null
}
interface AuditLogList {
  items: AuditLog[]; total: number; page: number; totalPages: number
  hasMore: boolean; firstPage: number; lastPage: number
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const ACTION_OPTIONS = [
  'CREATE','UPDATE','DELETE','LOGIN','EXPORT','UPLOAD','CONFIG','PERMISSION_CHANGE',
]

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

// ── Expanded row — shows changes table ────────────────────────────────────────
function ChangesRow({ changes }: { changes: AuditChange[] }) {
  if (!changes.length) return <p className="text-xs text-slate-400 italic">No field changes recorded.</p>
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50">
          <th className="text-left py-1 px-2 font-medium text-slate-500 w-1/4">Field</th>
          <th className="text-left py-1 px-2 font-medium text-slate-500 w-[37.5%]">Old value</th>
          <th className="text-left py-1 px-2 font-medium text-slate-500 w-[37.5%]">New value</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c, i) => (
          <tr key={i} className="border-t border-slate-100">
            <td className="py-1 px-2 font-mono text-slate-600">{c.field}</td>
            <td className="py-1 px-2 text-red-600 font-mono line-through opacity-70 max-w-[260px] truncate"
              title={c.oldValue ?? ''}>{c.oldValue ?? <span className="text-slate-300 no-underline">—</span>}</td>
            <td className="py-1 px-2 text-green-700 font-mono max-w-[260px] truncate"
              title={c.newValue ?? ''}>{c.newValue ?? <span className="text-slate-300">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Log row ───────────────────────────────────────────────────────────────────
function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasChanges = (log.changes?.length ?? 0) > 0

  return (
    <>
      <TableRow
        className={hasChanges ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/40'}
        onClick={() => hasChanges && setExpanded(v => !v)}
      >
        <TableCell className="py-2 pr-1 w-6">
          {hasChanges ? (
            expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              : <ChevronRightSm className="h-3.5 w-3.5 text-slate-400" />
          ) : <span className="w-3.5 inline-block" />}
        </TableCell>
        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(log.timestamp).toLocaleString()}
        </TableCell>
        <TableCell className="text-sm font-medium text-slate-800">{log.userName}</TableCell>
        <TableCell>
          <Badge className={`text-[10px] px-1.5 py-0.5 border font-semibold ${ACTION_STYLE[log.action] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {log.action}
          </Badge>
        </TableCell>
        <TableCell className="text-xs font-mono text-slate-600">{log.entityName}</TableCell>
        <TableCell className="text-xs text-slate-600 max-w-[200px] truncate" title={log.entityLabel ?? log.entityId}>
          {log.entityLabel ?? <span className="font-mono text-slate-400">{log.entityId.slice(0, 8)}…</span>}
        </TableCell>
        <TableCell className="text-xs text-slate-400">{log.changes?.length ?? 0}</TableCell>
        <TableCell className="text-xs text-slate-300 font-mono">{log.ipAddress ?? '—'}</TableCell>
      </TableRow>
      {expanded && hasChanges && (
        <TableRow className="bg-slate-50/70">
          <TableCell />
          <TableCell colSpan={7} className="pb-3 pt-1">
            <ChangesRow changes={log.changes!} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AuditLogsList() {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filter state
  const [fUser,      setFUser]      = useState('')
  const [fAction,    setFAction]    = useState('')
  const [fEntity,    setFEntity]    = useState('')
  const [fEntityId,  setFEntityId]  = useState('')
  const [fField,     setFField]     = useState('')
  const [fOldVal,    setFOldVal]    = useState('')
  const [fNewVal,    setFNewVal]    = useState('')
  const [fFrom,      setFFrom]      = useState('')
  const [fTo,        setFTo]        = useState('')

  const dbUser   = useDebounce(fUser,   350)
  const dbEntity = useDebounce(fEntity, 350)
  const dbField  = useDebounce(fField,  350)
  const dbOld    = useDebounce(fOldVal, 350)
  const dbNew    = useDebounce(fNewVal, 350)

  const resetPage = () => setPage(1)
  const hasFilters = !!(fUser || fAction || fEntity || fEntityId || fField || fOldVal || fNewVal || fFrom || fTo)

  const clearAll = () => {
    setFUser(''); setFAction(''); setFEntity(''); setFEntityId('')
    setFField(''); setFOldVal(''); setFNewVal('')
    setFFrom(''); setFTo(''); setPage(1)
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['auditLogs', page, pageSize, dbUser, fAction, dbEntity, fEntityId, dbField, dbOld, dbNew, fFrom, fTo],
    queryFn: () => executeGraphQL<{ auditLogs: AuditLogList }>(AUDIT_LOGS_QUERY, {
      page, pageSize,
      userNameContains:  dbUser   || undefined,
      action:            fAction  || undefined,
      entityName:        dbEntity || undefined,
      entityId:          fEntityId || undefined,
      fieldName:         dbField  || undefined,
      oldValueContains:  dbOld   || undefined,
      newValueContains:  dbNew   || undefined,
      fromDate:          fFrom   || undefined,
      toDate:            fTo     || undefined,
    }),
    staleTime: 15 * 1000,
  })

  const list      = data?.auditLogs
  const items     = list?.items ?? []
  const total     = list?.total ?? 0
  const totalPages = list?.totalPages ?? 1
  const hasMore   = list?.hasMore ?? false
  const firstPage = list?.firstPage ?? 1
  const lastPage  = list?.lastPage ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  const permissionDenied = isError && isPermissionError(error)

  const PaginationBar = ({ border }: { border: 'bottom' | 'top' }) => totalPages <= 1 ? null : (
    <div className={`flex flex-wrap items-center justify-between gap-3 py-2 ${border === 'bottom' ? 'border-t mt-2' : 'border-b mb-1'} border-slate-200`}>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="text-xs">{from}–{to} of {total}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Show</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="h-7 rounded border border-slate-200 bg-white px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-xs text-slate-400">per page</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => setPage(firstPage)} disabled={page <= firstPage} title="First"><ChevronsLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= firstPage} title="Prev"><ChevronLeft className="h-4 w-4" />Prev</Button>
        <span className="px-3 text-sm tabular-nums text-slate-600">{page} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!hasMore && page >= lastPage} title="Next">Next<ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setPage(lastPage)} disabled={page >= lastPage} title="Last"><ChevronsRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4 max-w-[1400px]">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Field-level change history — every create, update, delete, login, and upload action.
            </p>
          </div>
          {hasFilters && (
            <button type="button" onClick={clearAll}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-md px-3 py-1.5 bg-white hover:border-red-300 transition-colors">
              <X className="h-4 w-4" /> Clear all filters
            </button>
          )}
        </div>

        {/* Filter panel */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">

          {/* Row 1: who / what action / which entity */}
          <div className="flex flex-wrap gap-3 px-4 py-3 items-end">
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">User</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                <Input value={fUser} onChange={e => { setFUser(e.target.value); resetPage() }}
                  placeholder="Username…" className="h-9 pl-8 text-sm w-44" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Action</label>
              <select value={fAction} onChange={e => { setFAction(e.target.value); resetPage() }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44">
                <option value="">All actions</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Entity name</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                <Input value={fEntity} onChange={e => { setFEntity(e.target.value); resetPage() }}
                  placeholder="e.g. customer" className="h-9 pl-8 text-sm w-40" />
              </div>
            </div>

            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Entity ID</label>
              <Input value={fEntityId} onChange={e => { setFEntityId(e.target.value); resetPage() }}
                placeholder="UUID…" className="h-9 text-sm font-mono w-48" />
            </div>
          </div>

          {/* Row 2: field-level change search + date range */}
          <div className="flex flex-wrap gap-3 px-4 py-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Field changed</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                <Input value={fField} onChange={e => { setFField(e.target.value); resetPage() }}
                  placeholder="e.g. name, status" className="h-9 pl-8 text-sm w-40" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Old value contains</label>
              <Input value={fOldVal} onChange={e => { setFOldVal(e.target.value); resetPage() }}
                placeholder="Old value…" className="h-9 text-sm w-40" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">New value contains</label>
              <Input value={fNewVal} onChange={e => { setFNewVal(e.target.value); resetPage() }}
                placeholder="New value…" className="h-9 text-sm w-40" />
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">From date</label>
                <Input type="date" value={fFrom} onChange={e => { setFFrom(e.target.value); resetPage() }}
                  className="h-9 text-sm w-40" />
              </div>
              <span className="text-slate-300 mt-5">→</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">To date</label>
                <Input type="date" value={fTo} onChange={e => { setFTo(e.target.value); resetPage() }}
                  className="h-9 text-sm w-40" />
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-slate-50/60">
              {[
                fUser && { label: `User: ${fUser}`, clear: () => { setFUser(''); resetPage() } },
                fAction && { label: `Action: ${fAction}`, clear: () => { setFAction(''); resetPage() } },
                fEntity && { label: `Entity: ${fEntity}`, clear: () => { setFEntity(''); resetPage() } },
                fEntityId && { label: `ID: ${fEntityId.slice(0,8)}…`, clear: () => { setFEntityId(''); resetPage() } },
                fField && { label: `Field: ${fField}`, clear: () => { setFField(''); resetPage() } },
                fOldVal && { label: `Old → ${fOldVal}`, clear: () => { setFOldVal(''); resetPage() } },
                fNewVal && { label: `New → ${fNewVal}`, clear: () => { setFNewVal(''); resetPage() } },
                fFrom && { label: `From: ${fFrom}`, clear: () => { setFFrom(''); resetPage() } },
                fTo && { label: `To: ${fTo}`, clear: () => { setFTo(''); resetPage() } },
              ].filter(Boolean).map((chip, i) => (
                chip && <button key={i} type="button" onClick={chip.clear}
                  className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                  {chip.label} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {isLoading ? 'Loading…' : `${total.toLocaleString()} record${total !== 1 ? 's' : ''}`}
              </CardTitle>
              <CardDescription>
                {!isLoading && total > 0 && `Showing ${from}–${to}`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader /></div>
            ) : permissionDenied ? (
              <OperationNotPermitted context="You do not have permission to view audit logs." />
            ) : isError ? (
              <div className="text-center py-10 text-amber-800 font-medium">
                {getErrorMessage(error, 'Failed to load audit logs')}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm font-medium">No audit logs match your filters</p>
                {hasFilters && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={clearAll}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <PaginationBar border="bottom" />
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-6" />
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Record</TableHead>
                        <TableHead className="text-center">Changes</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(log => <LogRow key={log.id} log={log} />)}
                    </TableBody>
                  </Table>
                </div>
                <PaginationBar border="top" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
