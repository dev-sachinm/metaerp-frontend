import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Download, FileText, Plus, Save, X, Upload } from 'lucide-react'
import { usePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderQueries'
import { useUpdatePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderMutations'
import { useExpenseCategoriesList } from '@/hooks/graphql/useMasterDataQueries'
import { useCanAccess } from '@/hooks/usePermissions'
import { Loader } from '@/components/Loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { executeGraphQL } from '@/graphql/client'
import { EXPORT_PO_LINE_ITEMS_CSV, GET_PO_ATTACHMENT_UPLOAD_URL } from '@/graphql/queries/purchaseOrder.queries'
import { toast } from 'sonner'

import { DashboardLayout } from '@/layouts/DashboardLayout'

export function ViewPurchaseOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = usePurchaseOrder(id)
  const updateMutation = useUpdatePurchaseOrder(id!)
  const { data: expenseCategoriesData } = useExpenseCategoriesList(1, 200)
  
  const po = data?.purchaseOrder
  const canUpdate = useCanAccess('purchase_order', 'update')
  const canUpdateBom = useCanAccess('fixture_bom', 'update')

  const isMiscPo = po?.poType === 'Miscellaneous'
  const canEditLines = canUpdate && (isMiscPo || canUpdateBom)

  const [isEditingLines, setIsEditingLines] = useState(false)
  const [draftLines, setDraftLines] = useState<any[]>([])
  
  const [isExporting, setIsExporting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const data = await executeGraphQL<{ exportPurchaseOrderLineItemsCsv: string }>(EXPORT_PO_LINE_ITEMS_CSV, { id: po!.id })
      const csvString = data.exportPurchaseOrderLineItemsCsv
      if (!csvString) {
        toast.error('No data to export')
        return
      }
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `PO_${po!.poNumber}_LineItems.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      toast.error('Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const data = await executeGraphQL<{ getPurchaseOrderAttachmentUploadUrl: { uploadUrl: string, s3Key: string } }>(
        GET_PO_ATTACHMENT_UPLOAD_URL, 
        { poId: po!.id, filename: file.name }
      )
      const { uploadUrl, s3Key } = data.getPurchaseOrderAttachmentUploadUrl

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to S3')
      }

      await updateMutation.mutateAsync({ attachmentsToAdd: [{ s3Key, filename: file.name }] })
      toast.success('Attachment uploaded successfully')
    } catch (err) {
      toast.error('Failed to upload attachment')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-red-500">
          Failed to load purchase order details: {error?.message || 'Not found'}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-800">Line Items</h2>
              <div className="flex gap-2">
                {!isEditingLines && po.lineItems.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isExporting}>
                    <Download className="h-3.5 w-3.5 mr-2" /> {isExporting ? 'Exporting...' : 'Export CSV'}
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
                        <td colSpan={isMiscPo ? 3 : 5} className="px-3 py-4 text-center text-slate-500">No line items.</td>
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
                <span className="text-slate-500">Project ID</span>
                <span className="font-medium text-slate-900">{po.projectId || '—'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Created At</span>
                <span className="font-medium text-slate-900">{po.createdAt ? format(new Date(po.createdAt), 'dd MMM yyyy HH:mm') : '—'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-slate-500">Created By</span>
                <span className="font-medium text-slate-900">{po.createdByUsername || '—'}</span>
              </div>
            </div>
            
            {po.details && (
              <div className="pt-3 border-t">
                <span className="block text-xs font-semibold text-slate-500 mb-1">Details & Notes</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{po.details}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-800">Attachments</h2>
              {canUpdate && (
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg"
                  />
                  <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={isUploading}>
                    <Upload className="h-3.5 w-3.5 mr-2" /> {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              )}
            </div>
            {po.attachments ? (
              <div className="space-y-2">
                {(() => {
                  let parsedAttachments: string[] = []
                  try {
                    parsedAttachments = JSON.parse(po.attachments)
                    if (!Array.isArray(parsedAttachments)) parsedAttachments = [po.attachments]
                  } catch {
                    parsedAttachments = [po.attachments]
                  }

                  return parsedAttachments.map((att: any, idx: number) => {
                    const attString = typeof att === 'string' ? att : (att?.s3Key || String(att))
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">{att.filename || attString.split('/').pop() || attString}</span>
                      </div>
                      <a href={`/api/download/${encodeURIComponent(att.s3Key || attString)}`} target="_blank" rel="noreferrer" className="p-1 hover:bg-slate-200 rounded shrink-0">
                          <Download className="h-4 w-4 text-slate-600" />
                        </a>
                      </div>
                    )
                  })
                })()}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No attachments</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
