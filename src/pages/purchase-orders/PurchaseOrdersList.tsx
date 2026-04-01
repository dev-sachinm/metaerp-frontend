import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Trash2, Edit2 } from 'lucide-react'
import { usePurchaseOrders } from '@/hooks/graphql/usePurchaseOrderQueries'
import { useDeletePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderMutations'
import { useCanAccess } from '@/hooks/usePermissions'
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

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [isActive, setIsActive] = useState<string>('all')

  const { data, isLoading, isError, error } = usePurchaseOrders((page - 1) * pageSize, pageSize, isActive === 'all' ? null : isActive === 'true')
  const deleteMutation = useDeletePurchaseOrder()

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
    } catch (e: any) {
      // handled by mutation
    }
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

      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Status:</label>
          <select 
            value={isActive} 
            onChange={(e) => { setIsActive(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[140px]"
          >
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500">Failed to load purchase orders: {error?.message}</div>
        ) : !data?.purchaseOrders.items.length ? (
          <div className="p-12 text-center text-slate-500">No purchase orders found.</div>
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
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.purchaseOrders.items.map((po: any) => (
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
                      {po.poSendDate ? format(new Date(po.poSendDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                          onClick={() => navigate(`/purchase-orders/${po.id}/view`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                            onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
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

        {data?.purchaseOrders && data.purchaseOrders.totalPages > 1 && (
          <div className="border-t border-slate-200 p-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Page {page} of {data.purchaseOrders.totalPages} · {data.purchaseOrders.total} total
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page <= 1}>
                First
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.purchaseOrders.totalPages}>
                Next
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(data.purchaseOrders.totalPages)} disabled={page >= data.purchaseOrders.totalPages}>
                Last
              </Button>
            </div>
          </div>
        )}
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
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
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
