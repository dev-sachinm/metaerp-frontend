import { useState, useEffect, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  useMarkBomPartsReceived,
  useUpdateManufacturedStatusBulk,
  uploadInvoicePhoto,
} from '@/hooks/graphql/useBomReceivingMutations'
import { usePurchaseOrdersByFixture } from '@/hooks/graphql/usePurchaseOrderQueries'
import { executeGraphQL } from '@/graphql/client'
import { UPDATE_PURCHASE_ORDER } from '@/graphql/mutations/purchaseOrder.mutations'
import { toast } from 'sonner'
import type { ManufacturedPart, StandardPart } from '@/types/design'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedMfgParts: ManufacturedPart[]
  selectedStdParts: StandardPart[]
  fixtureId: string
}

interface DraftRow {
  fixtureBomId: string
  drawingNo: string
  description: string
  partType: 'Manufactured' | 'Standard'
  orderedQty: number | null
  currentReceived: number | null
  expQty: number | null
  inStock: number | null
  receivedQty: string
  needsStatusTransition: boolean
}

// ── helpers ──────────────────────────────────────────────────────────
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bytes = atob(base64)
  const buf = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
  return new Blob([buf], { type: mime })
}

function getCroppedImg(imageSrc: string, crop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = crop.width
      canvas.height = crop.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context unavailable'))
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

// ── component ────────────────────────────────────────────────────────
export function MarkAsReceivedDialog({
  open,
  onOpenChange,
  selectedMfgParts,
  selectedStdParts,
  fixtureId,
}: Props) {
  const receiveMutation = useMarkBomPartsReceived(fixtureId)
  const bulkStatusMutation = useUpdateManufacturedStatusBulk(fixtureId)
  const [rows, setRows] = useState<DraftRow[]>([])
  const [selectedPoId, setSelectedPoId] = useState<string>('')
  const [invoiceNumber, setInvoiceNumber] = useState<string>('')
  const [touched, setTouched] = useState({ po: false, invoice: false })
  const [markPoCompleted, setMarkPoCompleted] = useState(false)

  // Camera → Crop → Confirm flow
  type PhotoStage = 'idle' | 'camera' | 'crop' | 'confirmed'
  const [photoStage, setPhotoStage] = useState<PhotoStage>('idle')
  const [rawCapture, setRawCapture] = useState<string | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [cropState, setCropState] = useState({ x: 0, y: 0 })
  const [cropZoom, setCropZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const webcamRef = useRef<Webcam>(null)

  const { data: posData, isLoading: posLoading } = usePurchaseOrdersByFixture(
    fixtureId,
    null,
    open,
    undefined,
    ['Completed'],
  )
  const purchaseOrders = posData?.purchaseOrdersByFixture ?? []

  const initPartsRef = useRef({ mfg: selectedMfgParts, std: selectedStdParts })

  useEffect(() => {
    if (!open) return
    initPartsRef.current = { mfg: selectedMfgParts, std: selectedStdParts }
    const mfgRows: DraftRow[] = selectedMfgParts.map((p) => ({
      fixtureBomId: p.id,
      drawingNo: p.drawingNo,
      description: p.description,
      partType: 'Manufactured',
      orderedQty: p.qty ?? null,
      currentReceived: p.receivedQuantity ?? null,
      expQty: null,
      inStock: null,
      receivedQty: '',
      needsStatusTransition: p.status === 'quality_checked',
    }))
    const stdRows: DraftRow[] = selectedStdParts.map((p) => ({
      fixtureBomId: p.id,
      drawingNo: p.itemCode ?? '—',
      description: p.productName ?? '—',
      partType: 'Standard',
      orderedQty: null,
      currentReceived: p.receivedQuantity ?? null,
      expQty: p.expectedQty ?? null,
      inStock: p.currentStock ?? null,
      receivedQty: '',
      needsStatusTransition: false,
    }))
    setRows([...mfgRows, ...stdRows])
    setSelectedPoId('')
    setInvoiceNumber('')
    setTouched({ po: false, invoice: false })
    setMarkPoCompleted(false)
    setPhotoStage('idle')
    setRawCapture(null)
    setCroppedImage(null)
    setCropZoom(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const getRemaining = (row: DraftRow): number =>
    row.partType === 'Standard'
      ? Math.max(0, (row.expQty ?? 0) - (row.currentReceived ?? 0))
      : Math.max(0, (row.orderedQty ?? 0) - (row.currentReceived ?? 0))

  const handleQtyChange = (index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      const row = next[index]
      const remaining = getRemaining(row)
      const num = parseFloat(value)
      const clamped =
        value.trim() === '' ? '' : String(Math.min(isNaN(num) ? 0 : num, remaining))
      next[index] = { ...next[index], receivedQty: clamped }
      return next
    })
  }

  // Camera capture
  const handleCapture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) {
      setRawCapture(screenshot)
      setPhotoStage('crop')
      setCropState({ x: 0, y: 0 })
      setCropZoom(1)
    }
  }, [])

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirmCrop = useCallback(async () => {
    if (!rawCapture || !croppedAreaPixels) return
    try {
      const result = await getCroppedImg(rawCapture, croppedAreaPixels)
      setCroppedImage(result)
      setPhotoStage('confirmed')
    } catch {
      toast.error('Failed to crop image')
    }
  }, [rawCapture, croppedAreaPixels])

  const resetPhoto = () => {
    setPhotoStage('idle')
    setRawCapture(null)
    setCroppedImage(null)
    setCroppedAreaPixels(null)
  }

  // Validation
  const poMissing = !selectedPoId
  const invoiceMissing = !invoiceNumber.trim()
  const hasValidItems = rows.some(
    (r) => r.receivedQty.trim() !== '' && !Number.isNaN(parseFloat(r.receivedQty)) && parseFloat(r.receivedQty) >= 0,
  )
  const canSubmit = !poMissing && !invoiceMissing && hasValidItems

  const handleUpdateNow = async () => {
    setTouched({ po: true, invoice: true })
    if (!canSubmit) return

    const items = rows
      .filter((r) => r.receivedQty.trim() !== '')
      .map((r) => ({
        fixtureBomId: r.fixtureBomId,
        receivedQty: parseFloat(r.receivedQty),
        purchaseOrderId: selectedPoId,
        invoiceNumber: invoiceNumber.trim(),
      }))
      .filter((r) => !Number.isNaN(r.receivedQty) && r.receivedQty >= 0)

    if (items.length === 0) return

    const mfgNeedingTransition = rows
      .filter((r) => r.needsStatusTransition && r.receivedQty.trim() !== '')
      .map((r) => r.fixtureBomId)

    if (mfgNeedingTransition.length > 0) {
      await bulkStatusMutation.mutateAsync({
        partIds: mfgNeedingTransition,
        status: 'received',
      })
    }

    const result = await receiveMutation.mutateAsync(items)
    const events = result.markBomPartsReceived.events ?? []

    if (markPoCompleted) {
      try {
        await executeGraphQL(UPDATE_PURCHASE_ORDER, {
          id: selectedPoId,
          input: { poStatus: 'Completed' },
        })
        toast.success('Purchase order marked as completed')
      } catch {
        toast.error('Items received but failed to mark PO as completed')
      }
    }

    if (croppedImage && events.length > 0) {
      setIsUploading(true)
      try {
        const blob = dataUrlToBlob(croppedImage)
        const filename = `invoice_${Date.now()}.jpg`
        const eventIds = events.map((e) => e.id)
        await uploadInvoicePhoto(eventIds, blob, filename)
        toast.success('Invoice photo uploaded')
      } catch {
        toast.error('Received quantities saved but photo upload failed')
      } finally {
        setIsUploading(false)
      }
    } else if (croppedImage && events.length === 0) {
      toast.warning('Photo captured but no events were created — try with a receive quantity greater than 0')
    }

    onOpenChange(false)
  }

  const isPending = receiveMutation.isPending || bulkStatusMutation.isPending || isUploading
  const hasMfgRows = rows.some((r) => r.partType === 'Manufactured')
  const hasStdRows = rows.some((r) => r.partType === 'Standard')
  const colSpan = 6 + (hasMfgRows ? 1 : 0) + (hasStdRows ? 1 : 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark as Received</DialogTitle>
        </DialogHeader>

        {/* PO selector + Invoice Number + Capture button */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-start">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-600">
              Purchase Order <span className="text-rose-500">*</span>
            </Label>
            <select
              className={`h-8 w-full rounded-md border bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 ${
                touched.po && poMissing
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-200 focus:ring-teal-500'
              }`}
              value={selectedPoId}
              onChange={(e) => setSelectedPoId(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, po: true }))}
              disabled={posLoading}
            >
              <option value="">
                {posLoading ? 'Loading POs…' : purchaseOrders.length === 0 ? 'No open POs found' : '— Select PO —'}
              </option>
              {purchaseOrders.map((po) => {
                const typeLabel = po.poType === 'ManufacturedPart'
                  ? 'Mfg'
                  : po.poType === 'StandardPart'
                    ? 'Std'
                    : po.poType === 'Miscellaneous'
                      ? 'Misc'
                      : po.poType ?? ''
                return (
                  <option key={po.id} value={po.id}>
                    {po.poNumber}
                    {typeLabel ? ` [${typeLabel}]` : ''}
                    {po.title ? ` — ${po.title}` : ''}
                    {po.poStatus ? ` (${po.poStatus})` : ''}
                  </option>
                )
              })}
            </select>
            {touched.po && poMissing && (
              <p className="text-[10px] text-rose-500 mt-0.5">Please select a purchase order</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-600">
              Invoice / Challan Number <span className="text-rose-500">*</span>
            </Label>
            <Input
              className={`h-8 text-sm ${
                touched.invoice && invoiceMissing
                  ? 'border-rose-400 focus:ring-rose-400'
                  : ''
              }`}
              placeholder="e.g. INV/2026/0042"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, invoice: true }))}
            />
            {touched.invoice && invoiceMissing && (
              <p className="text-[10px] text-rose-500 mt-0.5">Invoice number is required</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-600 invisible">Action</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 whitespace-nowrap"
              onClick={() => {
                if (photoStage === 'confirmed') {
                  resetPhoto()
                } else if (photoStage === 'idle') {
                  setPhotoStage('camera')
                }
              }}
              disabled={photoStage === 'camera' || photoStage === 'crop'}
            >
              {photoStage === 'confirmed' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  Remove
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  Capture Invoice
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stage: Camera */}
        {photoStage === 'camera' && (
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.85}
              videoConstraints={{ facingMode: 'environment', width: 640, height: 480 }}
              className="w-full max-h-[240px] object-contain"
            />
            <div className="flex justify-center gap-2 p-2 bg-slate-900">
              <Button size="sm" onClick={handleCapture} className="bg-teal-600 hover:bg-teal-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                Capture
              </Button>
              <Button size="sm" variant="outline" onClick={resetPhoto} className="text-white border-slate-600 hover:bg-slate-800">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Stage: Crop */}
        {photoStage === 'crop' && rawCapture && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="relative w-full" style={{ height: 280 }}>
              <Cropper
                image={rawCapture}
                crop={cropState}
                zoom={cropZoom}
                aspect={4 / 3}
                onCropChange={setCropState}
                onZoomChange={setCropZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-500">Zoom</Label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={cropZoom}
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  className="w-24 accent-teal-600"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setPhotoStage('camera'); setRawCapture(null) }}
                >
                  Retake
                </Button>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => void handleConfirmCrop()}>
                  Confirm Crop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stage: Confirmed preview */}
        {photoStage === 'confirmed' && croppedImage && (
          <div className="relative rounded-lg border border-slate-200 overflow-hidden">
            <img src={croppedImage} alt="Cropped invoice" className="w-full max-h-[180px] object-contain bg-slate-50" />
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] bg-white/90 hover:bg-white"
                onClick={() => { setPhotoStage('camera'); setRawCapture(null); setCroppedImage(null) }}
              >
                Retake
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] bg-white/90 hover:bg-white text-rose-600 hover:text-rose-700"
                onClick={resetPhoto}
              >
                Remove
              </Button>
            </div>
            <div className="px-2 py-1 bg-emerald-50 border-t border-emerald-200">
              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Invoice photo ready — will upload on submit
              </p>
            </div>
          </div>
        )}

        {/* Parts table */}
        <div className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2">Drawing / Item</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-center">Part Type</th>
                {hasMfgRows && <th className="px-3 py-2 text-center">Ordered Qty</th>}
                <th className="px-3 py-2 text-center">Exp Qty</th>
                <th className="px-3 py-2 text-center">Already Received</th>
                {hasStdRows && <th className="px-3 py-2 text-center">In Stock</th>}
                <th className="px-3 py-2 text-center">Receive Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={row.fixtureBomId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs text-indigo-600 font-medium whitespace-nowrap">
                    {row.drawingNo}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700 max-w-[180px] truncate" title={row.description}>
                    {row.description}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        row.partType === 'Manufactured'
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-teal-700 bg-teal-50 border-teal-200'
                      }`}
                    >
                      {row.partType}
                    </Badge>
                  </td>
                  {hasMfgRows && (
                    <td className="px-3 py-2 text-center text-xs font-medium">
                      {row.partType === 'Manufactured' ? (row.orderedQty ?? '—') : <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-2 text-center text-xs font-medium">
                    {row.partType === 'Standard' ? (row.expQty ?? '—') : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-medium">
                    <span className={row.currentReceived != null && row.currentReceived > 0 ? 'text-orange-600' : 'text-slate-400'}>
                      {row.currentReceived ?? 0}
                    </span>
                  </td>
                  {hasStdRows && (
                    <td className="px-3 py-2 text-center text-xs font-medium">
                      {row.partType === 'Standard' ? (
                        <span className={row.inStock != null && row.inStock > 0 ? 'text-green-600' : 'text-slate-400'}>
                          {row.inStock ?? 0}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2 text-center">
                    <Input
                      className="h-7 text-xs px-1.5 py-0 w-20 text-center mx-auto"
                      type="number"
                      step="any"
                      min={0}
                      max={getRemaining(row)}
                      value={row.receivedQty}
                      onChange={(e) => handleQtyChange(i, e.target.value)}
                      placeholder="0"
                      disabled={getRemaining(row) <= 0}
                    />
                    {getRemaining(row) <= 0 ? (
                      <p className="text-[10px] text-slate-400 mt-0.5">fully received</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">max {getRemaining(row)}</p>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-6 text-center text-slate-400 text-sm">
                    No items selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-600">
            <input
              type="checkbox"
              checked={markPoCompleted}
              onChange={(e) => setMarkPoCompleted(e.target.checked)}
              disabled={isPending || !selectedPoId}
              className="h-4 w-4 rounded border-slate-300 accent-teal-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            Mark selected PO as Completed
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800"
              onClick={() => void handleUpdateNow()}
              disabled={isPending || !canSubmit}
            >
              {isUploading ? 'Uploading photo…' : isPending ? 'Updating…' : 'Update Now'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
