import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Trash2, Edit2, Search, X, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { usePurchaseOrders } from '@/hooks/graphql/usePurchaseOrderQueries'
import { useDeletePurchaseOrder, useTogglePOCosting } from '@/hooks/graphql/usePurchaseOrderMutations'
import { useCanAccess, useFieldAccess } from '@/hooks/usePermissions'
import { useCurrentUser } from '@/stores/authStore'
import { Loader } from '@/components/Loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { DashboardLayout } from '@/layouts/DashboardLayout'

export function PurchaseOrdersList() {
  const navigate = useNavigate()
  const canCreate = useCanAccess('purchase_order', 'create')
  const canUpdate = useCanAccess('purchase_order', 'update')
  const canDelete = useCanAccess('purchase_order', 'delete')
  const costingFieldAccess = useFieldAccess('purchase_order', 'enable_costing')

  const currentUser = useCurrentUser()
  const PRIVILEGED_ROLES = ['superadmin', 'Project Manager', 'Operations Head']
  const isPrivileged = (currentUser?.roles ?? []).some(r => PRIVILEGED_ROLES.includes(r))

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [isActive, setIsActive] = useState<string>('all')
  const [poNumberSearch, setPoNumberSearch] = useState('')
  const [titleSearch, setTitleSearch] = useState('')

  const debouncedPoNumber = useDebounce(poNumberSearch, 400)
  const debouncedTitle = useDebounce(titleSearch, 400)

  const hasFilters = poNumberSearch || titleSearch

  function resetPage() { setPage(1) }
  function clearAll() {
    setPoNumberSearch('')
    setTitleSearch('')
    setPage(1)
  }

  const { data, isLoading, isError, error } = usePurchaseOrders(page, pageSize, {
    isActive: isActive === 'all' ? undefined : isActive === 'true',
    poNumberContains: debouncedPoNumber || undefined,
    titleContains: debouncedTitle || undefined,
  })

  const deleteMutation = useDeletePurchaseOrder()
  const toggleCosting = useTogglePOCosting()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
    } catch {
      // handled by mutation
    }
  }

  const po = data?.purchaseOrders
  const items = po?.items ?? []

  const PaginationBar = () => {
    if (!po) return null
    const { total, totalPages, firstPage = 1, lastPage = totalPages, hasMore } = po
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, total)
    const isFirst = page <= firstPage
    const isLast = page >= lastPage || (!hasMore && page >= totalPages)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <span className="text-sm text-slate-600">{from}–{to} of {total}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setPage(firstPage)} disabled={isFirst} title="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={isFirst} title="Previous page">
            <ChevronLeft className="h-4 w-4" />Prev
          </Button>
          <span className="px-3 text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={isLast} title="Next page">
            Next<ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(lastPage)} disabled={isLast} title="Last page">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
            <p className="text-sm text-slate-500 mt-1">Manage purchase orders and track their statuses.</p>
          </div>
          {canCreate && (
            <Button onClick={() => navigate('/purchase-orders/create')} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              Create PO
            </Button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={poNumberSearch}
              onChange={(e) => { setPoNumberSearch(e.target.value); resetPage() }}
              placeholder="Search PO number…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={titleSearch}
              onChange={(e) => { setTitleSearch(e.target.value); resetPage() }}
              placeholder="Search title…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Status:</label>
            <select
              value={isActive}
              onChange={(e) => { setIsActive(e.target.value); resetPage() }}
              className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[140px]"
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-500 hover:text-slate-700 gap-1">
              <X className="h-3.5 w-3.5" />Clear
            </Button>
          )}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {po && <div className="border-b border-slate-200"><PaginationBar /></div>}

          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader /></div>
          ) : isError ? (
            <div className="p-12 text-center text-red-500">Failed to load purchase orders: {(error as any)?.message}</div>
          ) : !items.length ? (
            <div className="p-12 text-center text-slate-500">
              {debouncedPoNumber || debouncedTitle
                ? `No purchase orders found matching your search.`
                : 'No purchase orders found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Vendor / Supplier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Costing Date</th>
                    <th className="px-4 py-3">Completed</th>
                    {isPrivileged && <th className="px-4 py-3">Created By</th>}
                    <th className="px-4 py-3 text-center">Costing</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-indigo-600 font-medium">
                        <Link to={`/purchase-orders/${po.id}/view`} className="hover:underline">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{po.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {po.poType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {po.vendorName || po.supplierName || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={po.poStatus === 'Completed' ? 'success' : 'outline'}>
                          {po.poStatus || 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {po.createdAt ? format(new Date(po.createdAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {po.costingUpdatedDate ? format(new Date(po.costingUpdatedDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {po.completedDate ? format(new Date(po.completedDate), 'dd MMM yyyy') : '—'}
                      </td>
                      {isPrivileged && (
                        <td className="px-4 py-3 text-slate-600 text-sm">{po.createdByUsername || '—'}</td>
                      )}
                      <td className="px-4 py-3">
                        {(po.poType === 'ManufacturedPart' || po.poType === 'StandardPart') && costingFieldAccess !== 'hidden' && (() => {
                          const canWrite = costingFieldAccess === 'write'
                          const isOn = po.enableCosting
                          const isPending = toggleCosting.isPending
                          return (
                            <button
                              onClick={() => canWrite && !isPending && toggleCosting.mutate({ id: po.id, enableCosting: !isOn })}
                              disabled={!canWrite}
                              aria-label={isOn ? 'Disable costing' : 'Enable costing'}
                              className={[
                                'relative inline-flex h-6 w-[76px] shrink-0 items-center rounded-full px-0.5',
                                'overflow-hidden transition-colors duration-300 ease-in-out',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                isOn
                                  ? 'bg-emerald-500 focus-visible:ring-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.4)]'
                                  : 'bg-red-400 focus-visible:ring-red-400 shadow-[0_2px_6px_rgba(248,113,113,0.3)]',
                                canWrite ? 'cursor-pointer hover:brightness-105 active:scale-[0.97]' : 'cursor-default opacity-70',
                              ].join(' ')}
                            >
                              <span className="absolute left-1 z-0 select-none pointer-events-none text-[10px] font-bold tracking-wider uppercase text-white whitespace-nowrap">
                                {isOn ? 'Enabled' : 'Disabled'}
                              </span>
                              <span
                                className={[
                                  'relative z-10 h-5 w-5 shrink-0 rounded-full bg-white shadow-md',
                                  'transition-transform duration-300 ease-in-out',
                                  isOn ? 'translate-x-[52px]' : 'translate-x-0',
                                ].join(' ')}
                              />
                            </button>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                            onClick={() => navigate(`/purchase-orders/${po.id}/view`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canUpdate && (
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                              onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setDeleteId(po.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {po && <div className="border-t border-slate-200"><PaginationBar /></div>}
        </div>

        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Purchase Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this purchase order? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
