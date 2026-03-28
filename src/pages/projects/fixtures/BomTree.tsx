import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/Loader'
import {
  ChevronRight,
  ChevronDown,
  FolderClosed,
  FolderOpen,
  Wrench,
  Package,
  Eye,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { useBomView } from '@/hooks/graphql/useDesignItemCode'
import { fetchDrawingViewUrl } from '@/hooks/graphql/useDesign'
import { useSuppliers, useVendors } from '@/hooks/graphql/useMasterDataQueries'
import { useCreateManufacturedPo, useCreateStandardPo } from '@/hooks/graphql/usePurchaseOrderMutations'
import {
  useReceiveStandardParts,
  useUpdateManufacturedReceivedQty,
  useUpdateManufacturedStatusBulk,
  useUpdateStandardPartPurchaseUnitPrice,
} from '@/hooks/graphql/useBomReceivingMutations'
import { useUIPermission } from '@/hooks/usePermissions'
import { formatManufacturedStatus, MANUFACTURED_PART_STATUS_OPTIONS } from '@/lib/bomManufacturedStatuses'
import type { ManufacturedPart, StandardPart, FixtureSummary } from '@/types/design'
import { toast } from 'sonner'
import { FIXTURE_STATUS_LABELS } from '@/types/design'
import type { FixtureStatus } from '@/types/design'

// ── Status chip ───────────────────────────────────────────────────────────────
const STATUS_COLORS: Partial<Record<FixtureStatus, string>> = {
  design_pending:          'bg-slate-100 text-slate-600 border-slate-200',
  design_in_progress:      'bg-blue-50 text-blue-700 border-blue-200',
  procurement_in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  assembly_completed:      'bg-teal-50 text-teal-700 border-teal-200',
  cmm_confirmed:           'bg-indigo-50 text-indigo-700 border-indigo-200',
  dispatched:              'bg-green-50 text-green-700 border-green-200',
}

function StatusChip({ status }: { status: FixtureStatus }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {FIXTURE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── View drawing button ───────────────────────────────────────────────────────
function ViewDrawingBtn({ partId }: { partId: string }) {
  const [loading, setLoading] = useState(false)
  const handleClick = async () => {
    setLoading(true)
    try {
      const { viewUrl } = await fetchDrawingViewUrl(partId)
      window.open(viewUrl, '_blank', 'noopener,noreferrer')
    } catch { /* toast handled in util */ }
    finally { setLoading(false) }
  }
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 shrink-0"
      title="View Drawing"
    >
      <Eye className="h-3 w-3" />
      {loading ? '…' : 'View'}
    </button>
  )
}

// ── Manufactured part row ─────────────────────────────────────────────────────
function ManufacturedPartRow({
  part,
  checkbox,
  storeReceiving,
}: {
  part: ManufacturedPart
  checkbox?: { checked: boolean; onToggle: () => void }
  storeReceiving?: {
    enabled: boolean
    editing: boolean
    draftLh: string
    draftRh: string
    onDraftLh: (v: string) => void
    onDraftRh: (v: string) => void
    onBeginEdit: () => void
    onSave: () => void
    onCancel: () => void
    saving: boolean
  }
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      {checkbox && (
        <td className="py-1.5 px-2 w-10 align-middle">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={checkbox.checked}
            onChange={checkbox.onToggle}
            aria-label={`Select ${part.drawingNo}`}
          />
        </td>
      )}
      <td className="py-1.5 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">{part.drawingNo}</td>
      <td className="py-1.5 px-2 text-xs text-slate-700 max-w-[160px] truncate" title={part.description}>{part.description}</td>
      <td className="py-1.5 px-2 text-xs text-slate-500 whitespace-nowrap text-center">
        {part.qtyLh != null || part.qtyRh != null ? (
          <span>
            {part.qtyLh != null && <span className="text-slate-600">LH:{part.qtyLh}</span>}
            {part.qtyLh != null && part.qtyRh != null && <span className="text-slate-300 mx-1">|</span>}
            {part.qtyRh != null && <span className="text-slate-600">RH:{part.qtyRh}</span>}
          </span>
        ) : '—'}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-600 max-w-[110px] truncate" title={part.status ?? ''}>
        {formatManufacturedStatus(part.status)}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-600 text-center font-mono">
        {storeReceiving?.editing ? (
          <Input
            className="h-7 text-xs px-1 py-0 w-14"
            type="number"
            step="any"
            min={0}
            value={storeReceiving.draftLh}
            onChange={(e) => storeReceiving.onDraftLh(e.target.value)}
          />
        ) : (
          <span>{part.receivedLhQty != null ? part.receivedLhQty : '—'}</span>
        )}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-600 text-center font-mono">
        {storeReceiving?.editing ? (
          <Input
            className="h-7 text-xs px-1 py-0 w-14"
            type="number"
            step="any"
            min={0}
            value={storeReceiving.draftRh}
            onChange={(e) => storeReceiving.onDraftRh(e.target.value)}
          />
        ) : (
          <span>{part.receivedRhQty != null ? part.receivedRhQty : '—'}</span>
        )}
      </td>
      <td className="py-1.5 px-2 text-right whitespace-nowrap">
        {storeReceiving?.enabled && !storeReceiving.editing && (
          <button
            type="button"
            className="text-xs text-indigo-600 hover:underline mr-2"
            onClick={storeReceiving.onBeginEdit}
          >
            Edit
          </button>
        )}
        {storeReceiving?.editing && (
          <span className="inline-flex items-center gap-1 mr-1">
            <button
              type="button"
              className="text-xs text-indigo-600 font-medium disabled:opacity-50"
              disabled={storeReceiving.saving}
              onClick={storeReceiving.onSave}
            >
              Save
            </button>
            <button
              type="button"
              className="text-xs text-slate-500"
              disabled={storeReceiving.saving}
              onClick={storeReceiving.onCancel}
            >
              Cancel
            </button>
          </span>
        )}
        {part.drawingFileS3Key ? (
          <ViewDrawingBtn partId={part.id} />
        ) : (
          <span className="text-xs text-slate-300">No drawing</span>
        )}
      </td>
    </tr>
  )
}

type ManufacturedPartRowProps = Parameters<typeof ManufacturedPartRow>[0]

// ── Unit section (inside a fixture) ──────────────────────────────────────────
function UnitSection({
  unitSeq,
  parts,
  checkbox,
  storeReceivingForPart,
}: {
  unitSeq: number
  parts: ManufacturedPart[]
  checkbox?: { selectedIds: Set<string>; onToggle: (id: string) => void }
  storeReceivingForPart?: (part: ManufacturedPart) => ManufacturedPartRowProps['storeReceiving']
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded border border-slate-200 overflow-hidden">
      <button
        className="flex items-center gap-2 w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <Wrench className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span className="text-xs font-semibold text-slate-700">Unit {String(unitSeq).padStart(2, '0')}</span>
        <span className="text-xs text-slate-400">({parts.length} part{parts.length !== 1 ? 's' : ''})</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                {checkbox && (
                  <th className="py-1 px-2 w-10 text-left text-xs font-medium text-slate-400" />
                )}
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Drawing No</th>
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Description</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Qty</th>
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Status</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Rec LH</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Rec RH</th>
                <th className="py-1 px-2 text-right text-xs font-medium text-slate-400">Drawing</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <ManufacturedPartRow
                  key={p.id}
                  part={p}
                  checkbox={
                    checkbox
                      ? {
                          checked: checkbox.selectedIds.has(p.id),
                          onToggle: () => checkbox.onToggle(p.id),
                        }
                      : undefined
                  }
                  storeReceiving={storeReceivingForPart?.(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Standard parts section ────────────────────────────────────────────────────
function StandardPartsSection({
  parts,
  poMode,
  selectedIds,
  onTogglePart,
  storeMode,
  recvQtyByLine,
  onRecvQtyChange,
  priceDraftByLine,
  onPriceDraftChange,
  onSavePrice,
  savingPriceId,
}: {
  parts: StandardPart[]
  poMode?: boolean
  selectedIds?: Set<string>
  onTogglePart?: (id: string) => void
  storeMode?: boolean
  recvQtyByLine?: Record<string, string>
  onRecvQtyChange?: (lineId: string, value: string) => void
  priceDraftByLine?: Record<string, string>
  onPriceDraftChange?: (lineId: string, value: string) => void
  onSavePrice?: (lineId: string) => void
  savingPriceId?: string | null
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded border border-teal-100 overflow-hidden">
      <button
        className="flex items-center gap-2 w-full text-left px-3 py-2 bg-teal-50/60 hover:bg-teal-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <Package className="h-3.5 w-3.5 shrink-0 text-teal-600" />
        <span className="text-xs font-semibold text-teal-800">Standard Parts</span>
        <span className="text-xs text-teal-600">({parts.length})</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-white">
                {poMode && (
                  <th className="py-1 px-2 w-10 text-left text-xs font-medium text-slate-400" />
                )}
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Item Code</th>
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Name</th>
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Make</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Exp Qty</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">In Stock</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">To Purchase</th>
                {storeMode && (
                  <>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Receive qty</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Unit price</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => {
                const purchaseQty = p.purchaseQty ?? 0
                const needsPurchase = purchaseQty > 0
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-teal-50/40 transition-colors">
                    {poMode && (
                      <td className="py-1.5 px-2 w-10 align-middle">
                        {needsPurchase ? (
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedIds?.has(p.id) ?? false}
                            onChange={() => onTogglePart?.(p.id)}
                            aria-label={`Select ${p.partNo ?? p.id}`}
                          />
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">{p.partNo ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-700 max-w-[180px] truncate" title={p.productName ?? ''}>{p.productName ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-500">{p.productMake ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-600 text-center font-medium">
                      {p.expectedQty != null ? p.expectedQty : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-xs text-center font-medium">
                      {p.currentStock != null ? (
                        <span className={p.currentStock > 0 ? 'text-green-600' : 'text-slate-400'}>
                          {p.currentStock}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        needsPurchase
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-green-50 text-green-600 border border-green-200'
                      }`}>
                        {purchaseQty}
                      </span>
                    </td>
                    {storeMode && (
                      <>
                        <td className="py-1.5 px-2 text-center">
                          <Input
                            className="h-7 text-xs px-1 py-0 w-16 mx-auto"
                            type="number"
                            step="any"
                            min={0}
                            disabled={!p.productId}
                            placeholder="0"
                            value={recvQtyByLine?.[p.id] ?? ''}
                            onChange={(e) => onRecvQtyChange?.(p.id, e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              className="h-7 text-xs px-1 py-0 w-20"
                              type="number"
                              step="any"
                              min={0}
                              value={priceDraftByLine?.[p.id] ?? ''}
                              placeholder={p.purchaseUnitPrice != null ? String(p.purchaseUnitPrice) : '—'}
                              onChange={(e) => onPriceDraftChange?.(p.id, e.target.value)}
                            />
                            <button
                              type="button"
                              className="text-xs text-indigo-600 shrink-0 disabled:opacity-50"
                              disabled={savingPriceId === p.id}
                              onClick={() => onSavePrice?.(p.id)}
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Per-fixture expandable row ────────────────────────────────────────────────
interface FixtureTreeRowProps {
  fixture: FixtureSummary
  projectId: string
}

type BomWorkbenchMode = 'default' | 'procurement' | 'store'

function FixtureTreeRow({ fixture }: FixtureTreeRowProps) {
  const [expanded, setExpanded] = useState(false)
  const canCreatePo = useUIPermission('CREATE_PURCHASE_ORDER_PO')
  const canManageReceiving = useUIPermission('MANAGE_BOM_RECEIVING')
  const { data: vendorsData } = useVendors(0, 500, true)
  const { data: suppliersData } = useSuppliers(0, 500, true)
  const createMfgPo = useCreateManufacturedPo(fixture.id)
  const createStdPo = useCreateStandardPo(fixture.id)
  const receiveStd = useReceiveStandardParts(fixture.id)
  const bulkMfgStatus = useUpdateManufacturedStatusBulk(fixture.id)
  const updateRecvQty = useUpdateManufacturedReceivedQty(fixture.id)
  const updateStdPrice = useUpdateStandardPartPurchaseUnitPrice(fixture.id)

  const [bomMode, setBomMode] = useState<BomWorkbenchMode>('default')
  const [selMfg, setSelMfg] = useState<Set<string>>(() => new Set())
  const [selMfgStatus, setSelMfgStatus] = useState<Set<string>>(() => new Set())
  const [selStd, setSelStd] = useState<Set<string>>(() => new Set())
  const [vendorId, setVendorId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [mfgDlgOpen, setMfgDlgOpen] = useState(false)
  const [stdDlgOpen, setStdDlgOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkDlgOpen, setBulkDlgOpen] = useState(false)
  const [recvEditId, setRecvEditId] = useState<string | null>(null)
  const [recvDraftLh, setRecvDraftLh] = useState('')
  const [recvDraftRh, setRecvDraftRh] = useState('')
  const [recvQtyByLine, setRecvQtyByLine] = useState<Record<string, string>>({})
  const [priceDraftByLine, setPriceDraftByLine] = useState<Record<string, string>>({})
  const [savingPriceLineId, setSavingPriceLineId] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useBomView(expanded ? fixture.id : null, expanded)
  const bomView = data?.bomView

  const mfgPartIds = useMemo(
    () => bomView?.manufacturedParts.map((p) => p.id) ?? [],
    [bomView],
  )
  const stdEligibleIds = useMemo(
    () => (bomView?.standardParts ?? []).filter((p) => (p.purchaseQty ?? 0) > 0).map((p) => p.id),
    [bomView],
  )

  useEffect(() => {
    setSelMfg(new Set())
    setSelMfgStatus(new Set())
    setSelStd(new Set())
    setVendorId('')
    setSupplierId('')
    setBulkStatus('')
    setRecvEditId(null)
    setRecvDraftLh('')
    setRecvDraftRh('')
    setRecvQtyByLine({})
    setPriceDraftByLine({})
    setBomMode('default')
  }, [fixture.id])

  useEffect(() => {
    setSelMfg(new Set())
    setSelMfgStatus(new Set())
    setSelStd(new Set())
    setRecvEditId(null)
  }, [bomMode])

  const showProcurement = canCreatePo && bomMode === 'procurement'
  const showStore = canManageReceiving && bomMode === 'store'

  const toggleMfgPo = useCallback((id: string) => {
    setSelMfg((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleMfgStatus = useCallback((id: string) => {
    setSelMfgStatus((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleStd = useCallback((id: string) => {
    setSelStd((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllMfg = useCallback(() => setSelMfg(new Set(mfgPartIds)), [mfgPartIds])
  const clearMfg = useCallback(() => setSelMfg(new Set()), [])
  const selectAllMfgStatus = useCallback(() => setSelMfgStatus(new Set(mfgPartIds)), [mfgPartIds])
  const clearMfgStatus = useCallback(() => setSelMfgStatus(new Set()), [])
  const selectAllStd = useCallback(() => setSelStd(new Set(stdEligibleIds)), [stdEligibleIds])
  const clearStd = useCallback(() => setSelStd(new Set()), [])

  const vendors = vendorsData?.vendors.items ?? []
  const suppliers = suppliersData?.suppliers.items ?? []
  const selectedVendorName = vendors.find((v) => v.id === vendorId)?.name ?? ''
  const selectedSupplierName = suppliers.find((s) => s.id === supplierId)?.name ?? ''

  const handleConfirmMfg = async () => {
    if (!vendorId || selMfg.size === 0) return
    await createMfgPo.mutateAsync({ partIds: [...selMfg], vendorId })
    setMfgDlgOpen(false)
    clearMfg()
  }

  const handleConfirmStd = async () => {
    if (!supplierId || selStd.size === 0) return
    await createStdPo.mutateAsync({ partIds: [...selStd], supplierId })
    setStdDlgOpen(false)
    clearStd()
  }

  const beginRecvEdit = (part: ManufacturedPart) => {
    setRecvEditId(part.id)
    setRecvDraftLh(part.receivedLhQty != null ? String(part.receivedLhQty) : '')
    setRecvDraftRh(part.receivedRhQty != null ? String(part.receivedRhQty) : '')
  }

  const saveRecvEdit = async () => {
    if (!recvEditId) return
    const lhRaw = recvDraftLh.trim()
    const rhRaw = recvDraftRh.trim()
    const lh = lhRaw === '' ? null : parseFloat(lhRaw)
    const rh = rhRaw === '' ? null : parseFloat(rhRaw)
    if (lh != null && Number.isNaN(lh)) return
    if (rh != null && Number.isNaN(rh)) return
    await updateRecvQty.mutateAsync({
      partId: recvEditId,
      receivedLhQty: lh,
      receivedRhQty: rh,
    })
    setRecvEditId(null)
  }

  const storeReceivingForPart = (part: ManufacturedPart): ManufacturedPartRowProps['storeReceiving'] => {
    if (!showStore) return undefined
    const editing = recvEditId === part.id
    return {
      enabled: true,
      editing,
      draftLh: recvDraftLh,
      draftRh: recvDraftRh,
      onDraftLh: setRecvDraftLh,
      onDraftRh: setRecvDraftRh,
      onBeginEdit: () => beginRecvEdit(part),
      onSave: () => void saveRecvEdit(),
      onCancel: () => setRecvEditId(null),
      saving: updateRecvQty.isPending,
    }
  }

  const handleConfirmBulkStatus = async () => {
    if (!bulkStatus || selMfgStatus.size === 0) return
    await bulkMfgStatus.mutateAsync({ partIds: [...selMfgStatus], status: bulkStatus })
    setBulkDlgOpen(false)
    clearMfgStatus()
  }

  const handleRecordReceipt = async () => {
    if (!bomView) return
    const merged = new Map<string, number>()
    for (const p of bomView.standardParts) {
      const raw = recvQtyByLine[p.id]?.trim()
      if (!raw || !p.productId) continue
      const q = parseFloat(raw)
      if (Number.isNaN(q) || q <= 0) continue
      merged.set(p.productId, (merged.get(p.productId) ?? 0) + q)
    }
    const receipts = [...merged.entries()].map(([productId, receivedQty]) => ({ productId, receivedQty }))
    if (receipts.length === 0) {
      toast.error('Enter at least one positive receive quantity for a line with a product.')
      return
    }
    await receiveStd.mutateAsync(receipts)
  }

  const handleSaveLinePrice = async (lineId: string) => {
    const raw = priceDraftByLine[lineId]?.trim()
    if (raw === undefined || raw === '') return
    const v = parseFloat(raw)
    if (Number.isNaN(v)) return
    setSavingPriceLineId(lineId)
    try {
      await updateStdPrice.mutateAsync({ standardPartId: lineId, purchaseUnitPrice: v })
      setPriceDraftByLine((prev) => {
        const next = { ...prev }
        delete next[lineId]
        return next
      })
    } finally {
      setSavingPriceLineId(null)
    }
  }

  const units: Map<number, ManufacturedPart[]> = new Map()
  for (const part of bomView?.manufacturedParts ?? []) {
    const seq = part.unitSeq ?? 0
    if (!units.has(seq)) units.set(seq, [])
    units.get(seq)!.push(part)
  }
  const sortedUnits = [...units.entries()].sort(([a], [b]) => a - b)
  const stdParts = bomView?.standardParts ?? []
  const totalMfg = bomView?.manufacturedParts.length ?? 0
  const totalStd = stdParts.length

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Fixture header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded
          ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
        {expanded
          ? <FolderOpen className="h-4 w-4 shrink-0 text-indigo-500" />
          : <FolderClosed className="h-4 w-4 shrink-0 text-indigo-400" />}

        {/* Fixture number */}
        <span className="font-mono text-sm font-bold text-slate-800">{fixture.fixtureNumber}</span>

        {/* Status */}
        <StatusChip status={fixture.status as FixtureStatus} />

        {/* BOM state */}
        {fixture.bomFilename ? (
          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            {fixture.bomFilename}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            No BOM
          </span>
        )}

        {/* Part counts (shown once data is loaded) */}
        {bomView && (
          <div className="ml-auto flex items-center gap-2">
            {totalMfg > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                <Wrench className="h-3 w-3" />
                {totalMfg} mfg
              </span>
            )}
            {totalStd > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                <Package className="h-3 w-3" />
                {totalStd} std
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded BOM content */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <Loader /> Loading BOM…
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">Failed to load BOM</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {(error as { message?: string })?.message ?? 'An unexpected error occurred. Please try again.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {!bomView ? (
                <div className="flex items-center gap-2 py-3 text-sm text-slate-400 italic">
                  <FileText className="h-4 w-4" />
                  No BOM data yet. Upload a BOM at the project level to populate parts.
                </div>
              ) : sortedUnits.length === 0 && stdParts.length === 0 ? (
                <div className="flex items-center gap-2 py-3 text-sm text-slate-400 italic">
                  <FileText className="h-4 w-4" />
                  BOM uploaded but no parts found. The BOM may be empty.
                </div>
              ) : (
                <>
              {(canCreatePo || canManageReceiving) && (
                <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-200/80">
                  <span className="text-slate-500 text-xs mr-1">Workbench</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={bomMode === 'default' ? 'default' : 'outline'}
                    className={bomMode === 'default' ? 'bg-slate-800 hover:bg-slate-900' : ''}
                    onClick={(e) => {
                      e.stopPropagation()
                      setBomMode('default')
                    }}
                  >
                    View
                  </Button>
                  {canCreatePo && (
                    <Button
                      type="button"
                      size="sm"
                      variant={bomMode === 'procurement' ? 'default' : 'outline'}
                      className={bomMode === 'procurement' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                      onClick={(e) => {
                        e.stopPropagation()
                        setBomMode('procurement')
                      }}
                    >
                      Procurement
                    </Button>
                  )}
                  {canManageReceiving && (
                    <Button
                      type="button"
                      size="sm"
                      variant={bomMode === 'store' ? 'default' : 'outline'}
                      className={bomMode === 'store' ? 'bg-teal-700 hover:bg-teal-800' : ''}
                      onClick={(e) => {
                        e.stopPropagation()
                        setBomMode('store')
                      }}
                    >
                      Store &amp; QA
                    </Button>
                  )}
                </div>
              )}

              {/* Manufactured parts grouped by unit */}
              {sortedUnits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-amber-500" />
                      Manufactured Parts ({totalMfg})
                    </p>
                    {showProcurement && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <button
                          type="button"
                          className="underline hover:text-indigo-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllMfg()
                          }}
                        >
                          Select all
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          className="underline hover:text-indigo-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            clearMfg()
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {showStore && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <button
                          type="button"
                          className="underline hover:text-teal-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllMfgStatus()
                          }}
                        >
                          Select all
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          className="underline hover:text-teal-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            clearMfgStatus()
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  {showProcurement && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-slate-500">Vendor</Label>
                        <select
                          className="text-xs border border-slate-200 rounded-md px-2 py-1.5 min-w-[200px] bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                        >
                          <option value="">Select vendor…</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        disabled={!vendorId || selMfg.size === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMfgDlgOpen(true)
                        }}
                      >
                        Create manufacturing PO…
                      </Button>
                    </div>
                  )}
                  {showStore && sortedUnits.length > 0 && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-slate-500">Set status</Label>
                        <select
                          className="text-xs border border-slate-200 rounded-md px-2 py-1.5 min-w-[200px] bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                          value={bulkStatus}
                          onChange={(e) => setBulkStatus(e.target.value)}
                        >
                          <option value="">Select status…</option>
                          {MANUFACTURED_PART_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-teal-700 hover:bg-teal-800"
                        disabled={!bulkStatus || selMfgStatus.size === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setBulkDlgOpen(true)
                        }}
                      >
                        Apply to selected…
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {sortedUnits.map(([unitSeq, parts]) => (
                      <UnitSection
                        key={unitSeq}
                        unitSeq={unitSeq}
                        parts={parts}
                        checkbox={
                          showProcurement
                            ? { selectedIds: selMfg, onToggle: toggleMfgPo }
                            : showStore
                              ? { selectedIds: selMfgStatus, onToggle: toggleMfgStatus }
                              : undefined
                        }
                        storeReceivingForPart={storeReceivingForPart}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Standard parts */}
              {stdParts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-teal-500" />
                      Standard Parts ({totalStd})
                    </p>
                    {showProcurement && stdEligibleIds.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <button
                          type="button"
                          className="underline hover:text-indigo-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllStd()
                          }}
                        >
                          Select all (to purchase)
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          className="underline hover:text-indigo-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            clearStd()
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  {showProcurement && stdEligibleIds.length > 0 && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-teal-200 bg-teal-50/40 px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-slate-500">Supplier</Label>
                        <select
                          className="text-xs border border-slate-200 rounded-md px-2 py-1.5 min-w-[200px] bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
                        >
                          <option value="">Select supplier…</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        disabled={!supplierId || selStd.size === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setStdDlgOpen(true)
                        }}
                      >
                        Create standard PO…
                      </Button>
                    </div>
                  )}
                  {showStore && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-teal-300 text-teal-800 hover:bg-teal-50"
                        disabled={receiveStd.isPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleRecordReceipt()
                        }}
                      >
                        {receiveStd.isPending ? 'Recording…' : 'Record stock receipt'}
                      </Button>
                    </div>
                  )}
                  <StandardPartsSection
                    parts={stdParts}
                    poMode={showProcurement}
                    selectedIds={selStd}
                    onTogglePart={toggleStd}
                    storeMode={showStore}
                    recvQtyByLine={recvQtyByLine}
                    onRecvQtyChange={(lineId, value) =>
                      setRecvQtyByLine((prev) => ({ ...prev, [lineId]: value }))
                    }
                    priceDraftByLine={priceDraftByLine}
                    onPriceDraftChange={(lineId, value) =>
                      setPriceDraftByLine((prev) => ({ ...prev, [lineId]: value }))
                    }
                    onSavePrice={(lineId) => void handleSaveLinePrice(lineId)}
                    savingPriceId={savingPriceLineId}
                  />
                </div>
              )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {mfgDlgOpen && (
        <Dialog open={mfgDlgOpen} onOpenChange={setMfgDlgOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create manufacturing PO?</DialogTitle>
              <DialogDescription>
                This creates a purchase order for {selMfg.size} manufactured part
                {selMfg.size === 1 ? '' : 's'} with vendor{' '}
                <span className="font-medium text-slate-700">{selectedVendorName || '—'}</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setMfgDlgOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void handleConfirmMfg()}
                disabled={createMfgPo.isPending || !vendorId || selMfg.size === 0}
              >
                {createMfgPo.isPending ? 'Creating…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {stdDlgOpen && (
        <Dialog open={stdDlgOpen} onOpenChange={setStdDlgOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create standard PO?</DialogTitle>
              <DialogDescription>
                This creates a purchase order for {selStd.size} standard line
                {selStd.size === 1 ? '' : 's'} with supplier{' '}
                <span className="font-medium text-slate-700">{selectedSupplierName || '—'}</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setStdDlgOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void handleConfirmStd()}
                disabled={createStdPo.isPending || !supplierId || selStd.size === 0}
              >
                {createStdPo.isPending ? 'Creating…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {bulkDlgOpen && (
        <Dialog open={bulkDlgOpen} onOpenChange={setBulkDlgOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply status to selected parts?</DialogTitle>
              <DialogDescription>
                Set status to{' '}
                <span className="font-medium text-slate-700">
                  {MANUFACTURED_PART_STATUS_OPTIONS.find((o) => o.value === bulkStatus)?.label ?? bulkStatus}
                </span>{' '}
                for {selMfgStatus.size} manufactured part{selMfgStatus.size === 1 ? '' : 's'}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setBulkDlgOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-teal-700 hover:bg-teal-800"
                onClick={() => void handleConfirmBulkStatus()}
                disabled={bulkMfgStatus.isPending || !bulkStatus || selMfgStatus.size === 0}
              >
                {bulkMfgStatus.isPending ? 'Applying…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ── Project-level BOM tree ────────────────────────────────────────────────────
interface BomTreeProps {
  projectId: string
  projectName: string
  fixtures: FixtureSummary[]
  showRoot?: boolean
}

export function BomTree({ projectId, projectName, fixtures, showRoot = true }: BomTreeProps) {
  const [rootOpen, setRootOpen] = useState(true)

  const fixtureList = (
    <div className="space-y-2">
      {fixtures.map((f) => (
        <FixtureTreeRow key={f.id} fixture={f} projectId={projectId} />
      ))}
    </div>
  )

  if (!showRoot) return fixtureList

  return (
    <div className="space-y-2">
      <button
        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        onClick={() => setRootOpen((v) => !v)}
      >
        {rootOpen
          ? <ChevronDown className="h-4 w-4 text-slate-400" />
          : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <FolderOpen className="h-4 w-4 text-indigo-500" />
        {projectName}
        <Badge variant="secondary" className="ml-1 text-xs">{fixtures.length} fixture{fixtures.length !== 1 ? 's' : ''}</Badge>
      </button>

      {rootOpen && (
        <div className="ml-5 border-l border-slate-100 pl-3">
          {fixtureList}
        </div>
      )}
    </div>
  )
}
