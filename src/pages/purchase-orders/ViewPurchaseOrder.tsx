import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Download, FileText, Plus, Save, X, Upload, Send, Paperclip } from 'lucide-react'
import { usePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderQueries'
import { useUpdatePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderMutations'
import { useExpenseCategoriesList } from '@/hooks/graphql/useMasterDataQueries'
import { useCanAccess } from '@/hooks/usePermissions'
import { isPermissionError } from '@/lib/graphqlErrors'
import { useCurrentUser } from '@/stores/authStore'
import { Loader } from '@/components/Loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { executeGraphQL } from '@/graphql/client'
import { GET_PO_ATTACHMENT_DOWNLOAD_URL, GET_PO_ATTACHMENT_UPLOAD_URL } from '@/graphql/queries/purchaseOrder.queries'
import { toast } from 'sonner'

import { DashboardLayout } from '@/layouts/DashboardLayout'
import { CostingDialog } from './CostingDialog'

export function ViewPurchaseOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = usePurchaseOrder(id)
  const updateMutation = useUpdatePurchaseOrder(id!)
  const { data: expenseCategoriesData } = useExpenseCategoriesList(1, 200)
  
  const po = data?.purchaseOrder
  const currentUser = useCurrentUser()
  const userRoles = currentUser?.roles ?? []
  const isManufacturing = userRoles.some(r => r === 'Manufacturing')
  const isProcurement = userRoles.some(r => r === 'Procurement')
  const canUpdate = useCanAccess('purchase_order', 'update')
  const canUpdateBom = useCanAccess('fixture_bom', 'update')

  const isMiscPo = po?.poType === 'Miscellaneous'
  const isManufacturedPo = po?.poType === 'ManufacturedPart'
  const isCompleted = po?.poStatus === 'Completed'
  const isStandardPo = po?.poType === 'StandardPart'
  const canEditLines = canUpdate && !isManufacturedPo && !isCompleted && (isMiscPo || isStandardPo || canUpdateBom)
  const canCosting = canUpdate && isManufacturing && isManufacturedPo

  const [isEditingLines, setIsEditingLines] = useState(false)
  const [draftLines, setDraftLines] = useState<any[]>([])
  const [costingOpen, setCostingOpen] = useState(false)

  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [attachUploadError, setAttachUploadError] = useState<string | null>(null)

  const STANDARD_PO_ALLOWED = new Set(['.xlsx', '.xls', '.pdf', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'])

  const handleAttachmentUpload = async (file: File) => {
    setAttachUploadError(null)
    if (isStandardPo) {
      const ext = '.' + file.name.split('.').pop()!.toLowerCase()
      if (!STANDARD_PO_ALLOWED.has(ext)) {
        setAttachUploadError(`File type "${ext}" is not allowed for Standard Part POs. Allowed: Excel, PDF, CSV, and images.`)
        return
      }
    }
    try {
      setIsUploading(true)
      const urlData = await executeGraphQL<{ getPurchaseOrderAttachmentUploadUrl: { uploadUrl: string; s3Key: string } }>(
        GET_PO_ATTACHMENT_UPLOAD_URL, { poId: po!.id, filename: file.name }
      )
      const { uploadUrl, s3Key } = urlData.getPurchaseOrderAttachmentUploadUrl
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } })
      await updateMutation.mutateAsync({ attachmentsToAdd: [{ s3Key, filename: file.name }] })
      toast.success(`"${file.name}" attached`)
    } catch (e: any) {
      const msg = e?.response?.errors?.[0]?.message ?? e?.message ?? 'Upload failed'
      setAttachUploadError(msg)
    } finally {
      setIsUploading(false)
      if (attachmentInputRef.current) attachmentInputRef.current.value = ''
    }
  }


  const handleDownloadAttachment = async (s3Key: string, fallbackFilename?: string | null) => {
    try {
      const data = await executeGraphQL<{ getPurchaseOrderAttachmentDownloadUrl: { downloadUrl: string; filename: string } }>(
        GET_PO_ATTACHMENT_DOWNLOAD_URL, { s3Key }
      )
      const { downloadUrl, filename } = data.getPurchaseOrderAttachmentDownloadUrl
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', filename || fallbackFilename || s3Key.split('/').pop() || 'attachment')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      toast.error('Failed to get download link')
    }
  }

  const startEditLines = () => {
    setIsEditingLines(true)
    // Clone existing line items
    setDraftLines(po?.lineItems.map(item => ({ ...item })) || [])
  }

  const cancelEditLines = () => {
    setIsEditingLines(false)
    setDraftLines([])
  }

  const handleDraftChange = (index: number, field: string, value: any) => {
    const updated = [...draftLines]
    updated[index][field] = value
    setDraftLines(updated)
  }

  const handleAddDraftLine = () => {
    setDraftLines([
      ...draftLines, 
      { description: '', expenseCategoryId: null, miscellaneousLineItemCost: 0 }
    ])
  }

  const handleRemoveDraftLine = (index: number) => {
    setDraftLines(draftLines.filter((_, i) => i !== index))
  }

  const saveLines = async () => {
    // clean up draft
    const cleaned = draftLines.map(item => {
      const { __typename, id, purchaseOrderId, createdAt, drawingNumber, bomDescription, quantity, purchaseUnitPrice, status, lhRh, receivedQuantity, ...rest } = item
      return {
        ...rest,
        miscellaneousLineItemCost: parseFloat(rest.miscellaneousLineItemCost) || 0,
        ...(purchaseUnitPrice != null && purchaseUnitPrice !== ''
          ? { purchaseUnitPrice: parseFloat(purchaseUnitPrice) }
          : {}),
      }
    })

    try {
      await updateMutation.mutateAsync({ lineItems: cleaned })
      setIsEditingLines(false)
    } catch (e) {
      // handled by mutation
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <Loader />
        </div>
      </DashboardLayout>
    )
  }

  if (isError || !po) {
    const isAccessDenied = isPermissionError(error)
    return (
      <DashboardLayout>
        <div className="p-12 flex flex-col items-center gap-4 text-center">
          {isAccessDenied ? (
            <>
              <div className="text-4xl">🔒</div>
              <h2 className="text-lg font-semibold text-slate-800">Access Denied</h2>
              <p className="text-sm text-slate-500 max-w-sm">
                You don't have permission to view this purchase order. It may belong to another user.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-red-600">Failed to load purchase order</h2>
              <p className="text-sm text-slate-500">{error?.message || 'Not found'}</p>
            </>
          )}
          <button
            onClick={() => navigate('/purchase-orders')}
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            ← Back to Purchase Orders
          </button>
        </div>
      </DashboardLayout>
    )
  }

  /** Standard / Manufactured: drawing number only in this column. */
  const drawingNumberOnly = (item: { drawingNumber?: string | null }) =>
    item.drawingNumber?.trim() || '—'

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchase-orders')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{po.poNumber}</h1>
              <Badge variant={po.poStatus === 'Completed' ? 'success' : 'outline'}>{po.poStatus || 'Draft'}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{po.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!po.sendPoEnabled}
            title={
              !po.sendPoEnabled
                ? isManufacturedPo && !po.enableCosting
                  ? 'Enable costing first'
                  : 'Sending is not enabled for this PO'
                : undefined
            }
          >
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-800">Line Items</h2>
              <div className="flex gap-2">
                {canCosting && !isEditingLines && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCostingOpen(true)}
                    disabled={!po.enableCosting}
                    title={!po.enableCosting ? 'Costing is not enabled for this PO' : undefined}
                  >
                    <Upload className="h-3.5 w-3.5 mr-2" /> Costing
                  </Button>
                )}

                {canEditLines && !isEditingLines && (
                  <Button variant="outline" size="sm" onClick={startEditLines}>
                    <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit Lines
                  </Button>
                )}
                {canEditLines && isEditingLines && (
                  <>
                    <Button variant="ghost" size="sm" onClick={cancelEditLines} disabled={updateMutation.isPending}>
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={saveLines} disabled={updateMutation.isPending}>
                      <Save className="h-3.5 w-3.5 mr-2" /> Save
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">
                      {isMiscPo ? 'Description' : 'Drawing Number / Item Code'}
                    </th>
                    {!isMiscPo && <th className="px-3 py-2 text-center">Qty</th>}
                    {!isMiscPo && <th className="px-3 py-2 text-center">Received</th>}
                    {!isMiscPo && <th className="px-3 py-2 text-right">Unit Price</th>}
                    {isManufacturedPo && <th className="px-3 py-2 text-right">Total</th>}
                    {!isMiscPo && <th className="px-3 py-2 text-center">Status</th>}
                    {isMiscPo && <th className="px-3 py-2 text-right">Expense Category</th>}
                    {isMiscPo && <th className="px-3 py-2 text-right">Misc Cost</th>}
                    {isEditingLines && <th className="px-3 py-2 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!isEditingLines ? (
                    po.lineItems.length > 0 ? (
                      po.lineItems.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2">
                            {isMiscPo ? (
                              <div className="font-medium text-slate-800">{item.description?.trim() || '—'}</div>
                            ) : (
                              <div className="font-mono text-indigo-600 font-medium">{drawingNumberOnly(item)}</div>
                            )}
                          </td>
                          {!isMiscPo && <td className="px-3 py-2 text-center font-medium">{item.quantity ?? '—'}</td>}
                          {!isMiscPo && <td className="px-3 py-2 text-center font-medium">{item.receivedQuantity ?? '—'}</td>}
                          {!isMiscPo && <td className="px-3 py-2 text-right font-mono">{item.purchaseUnitPrice != null ? item.purchaseUnitPrice.toFixed(2) : '—'}</td>}
                          {isManufacturedPo && <td className="px-3 py-2 text-right font-mono text-slate-700">
                            {item.purchaseUnitPrice != null && item.quantity != null
                              ? (item.purchaseUnitPrice * item.quantity).toFixed(2)
                              : '—'}
                          </td>}
                          {!isMiscPo && <td className="px-3 py-2 text-center">
                            {item.status ? (
                              <Badge variant="secondary" className="text-[10px] font-mono">{item.status}</Badge>
                            ) : '—'}
                          </td>}
                          {isMiscPo && <td className="px-3 py-2 text-right">
                            {item.expenseCategoryId 
                              ? (expenseCategoriesData?.expenseCategoriesList.items.find((ec: any) => ec.id === item.expenseCategoryId)?.name || '—') 
                              : '—'}
                          </td>}
                          {isMiscPo && <td className="px-3 py-2 text-right font-mono">{item.miscellaneousLineItemCost != null ? item.miscellaneousLineItemCost.toFixed(2) : '—'}</td>}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isMiscPo ? 3 : isManufacturedPo ? 6 : 5} className="px-3 py-4 text-center text-slate-500">No line items.</td>
                      </tr>
                    )
                  ) : (
                    <>
                      {draftLines.map((item, index) => (
                        <tr key={index}>
                          <td className="px-1 py-2">
                            {isMiscPo ? (
                              <Input 
                                className="h-8 text-sm" 
                                value={item.description || ''} 
                                onChange={(e) => handleDraftChange(index, 'description', e.target.value)} 
                                disabled={!!item.fixtureBomId}
                                placeholder={item.bomDescription || 'Description'}
                              />
                            ) : (
                              <div className="font-mono text-sm text-indigo-600 font-medium px-2 py-1.5">{drawingNumberOnly(item)}</div>
                            )}
                          </td>
                          {!isMiscPo && <td className="px-1 py-2 text-center text-slate-500 text-sm">
                            {item.quantity ?? '—'}
                          </td>}
                          {!isMiscPo && <td className="px-1 py-2 text-center text-slate-500 text-sm">
                            {item.receivedQuantity ?? '—'}
                          </td>}
                          {!isMiscPo && <td className="px-1 py-2">
                            <Input 
                              className="h-8 text-sm w-24 text-right ml-auto" 
                              type="number" step="any" min={0}
                              value={item.purchaseUnitPrice ?? ''} 
                              onChange={(e) => handleDraftChange(index, 'purchaseUnitPrice', e.target.value)} 
                              disabled={!item.fixtureBomId || !canUpdateBom}
                            />
                          </td>}
                          {isManufacturedPo && <td className="px-1 py-2 text-right font-mono text-sm text-slate-500">
                            {item.purchaseUnitPrice != null && item.quantity != null
                              ? (parseFloat(item.purchaseUnitPrice) * item.quantity).toFixed(2)
                              : '—'}
                          </td>}
                          {!isMiscPo && <td className="px-1 py-2 text-center text-slate-500 text-sm">
                            {item.status ?? '—'}
                          </td>}
                          {isMiscPo && <td className="px-1 py-2">
                            <select 
                              value={item.expenseCategoryId || 'none'} 
                              onChange={(e) => handleDraftChange(index, 'expenseCategoryId', e.target.value === 'none' ? null : e.target.value)}
                              className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-8"
                            >
                              <option value="none">Select...</option>
                              {expenseCategoriesData?.expenseCategoriesList.items.map((ec: any) => (
                                <option key={ec.id} value={ec.id}>{ec.name}</option>
                              ))}
                            </select>
                          </td>}
                          {isMiscPo && <td className="px-1 py-2">
                            <Input 
                              className="h-8 text-sm w-24 text-right ml-auto" 
                              type="number" step="any" min={0}
                              value={item.miscellaneousLineItemCost || ''} 
                              onChange={(e) => handleDraftChange(index, 'miscellaneousLineItemCost', e.target.value)} 
                            />
                          </td>}
                          <td className="px-1 py-2 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveDraftLine(index)} 
                              className="text-rose-500 h-8 w-8 p-0" 
                              disabled={!!item.fixtureBomId}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {isMiscPo && (
                        <tr>
                          <td colSpan={4} className="px-1 py-2">
                            <Button variant="outline" size="sm" onClick={handleAddDraftLine} className="w-full text-indigo-600 border-indigo-200 border-dashed">
                              <Plus className="h-4 w-4 mr-2" /> Add Row
                            </Button>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Information</h2>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900">{po.poType}</span>
              </div>
              {po.vendorName && (
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">Vendor</span>
                  <span className="font-medium text-slate-900">{po.vendorName}</span>
                </div>
              )}
              {po.supplierName && (
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">Supplier</span>
                  <span className="font-medium text-slate-900">{po.supplierName}</span>
                </div>
              )}
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Project Name</span>
                <span className="font-medium text-slate-900">{po.projectName ?? po.projectId ?? '—'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Created At</span>
                <span className="font-medium text-slate-900">{po.createdAt ? format(new Date(po.createdAt), 'dd MMM yyyy HH:mm') : '—'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Created By</span>
                <span className="font-medium text-slate-900">{po.createdByUsername || '—'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Costing Date</span>
                <span className="font-medium text-slate-900">{po.costingUpdatedDate ? format(new Date(po.costingUpdatedDate), 'dd MMM yyyy HH:mm') : '—'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Completed Date</span>
                <span className="font-medium text-slate-900">{po.completedDate ? format(new Date(po.completedDate), 'dd MMM yyyy HH:mm') : '—'}</span>
              </div>
            </div>
            
          </div>

          {po.lineItemsSummary && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">Item Count</span>
                  <span className="font-medium text-slate-900">{po.lineItemsSummary.itemCount}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">Total Cost</span>
                  <span className="font-mono font-semibold text-slate-900">{po.lineItemsSummary.totalCost != null ? po.lineItemsSummary.totalCost.toFixed(2) : '—'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-800">Attachments</h2>
              {isStandardPo && canUpdate && isProcurement && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAttachUploadError(null); attachmentInputRef.current?.click() }}
                  disabled={isUploading}
                >
                  <Paperclip className="h-3.5 w-3.5 mr-2" />
                  {isUploading ? 'Uploading…' : 'Attach File'}
                </Button>
              )}
            </div>

            {isStandardPo && (
              <p className="text-xs text-slate-400">
                Allowed: Excel (.xlsx, .xls), PDF, CSV, and images (.jpg, .jpeg, .png)
              </p>
            )}

            {attachUploadError && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <X className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{attachUploadError}</span>
              </div>
            )}

            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              accept={isStandardPo ? '.xlsx,.xls,.pdf,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,image/*' : undefined}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachmentUpload(f) }}
            />

            {po.parsedAttachments && po.parsedAttachments.length > 0 ? (
              <div className="space-y-2">
                {po.parsedAttachments.map((att, idx) => (
                  <div key={att.id ?? idx} className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-700 truncate block">{att.filename || att.name || att.s3Key.split('/').pop()}</span>
                        {att.uploadedAt && (
                          <span className="text-xs text-slate-400">{format(new Date(att.uploadedAt), 'dd MMM yyyy HH:mm')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadAttachment(att.s3Key, att.filename ?? att.name)}
                      className="p-1 hover:bg-slate-200 rounded shrink-0 ml-2"
                    >
                      <Download className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No attachments</p>
            )}
          </div>
        </div>
      </div>
    </div>
    {po && (
      <CostingDialog
        open={costingOpen}
        onOpenChange={setCostingOpen}
        poId={po.id}
        fixtureId={po.fixtureId ?? undefined}
      />
    )}
    </DashboardLayout>
  )
}
