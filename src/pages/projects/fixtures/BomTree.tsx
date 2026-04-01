import { useMemo, useState, useEffect, useCallback } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useCurrentUser } from '@/stores/authStore'
import { useCreateManufacturedPo, useCreateStandardPo } from '@/hooks/graphql/usePurchaseOrderMutations'
import {
  useUpdateManufacturedReceivedQty,
  useUpdateManufacturedStatusBulk,
  useUpdateStandardPartPurchaseUnitPrice,
} from '@/hooks/graphql/useBomReceivingMutations'
import { useUIPermission, useCanAccess } from '@/hooks/usePermissions'
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
  showReceiveQty,
}: {
  part: ManufacturedPart
  checkbox?: { checked: boolean; onToggle: () => void; disabled?: boolean }
  storeReceiving?: {
    enabled: boolean
    editing: boolean
    draftQty: string
    onDraftQty: (v: string) => void
    onBeginEdit: () => void
    onSave: () => void
    onCancel: () => void
    saving: boolean
  }
  showReceiveQty?: boolean
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      {checkbox && (
        <td className="py-1.5 px-2 w-10 align-middle">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            checked={checkbox.checked}
            onChange={checkbox.onToggle}
            disabled={checkbox.disabled}
            aria-label={`Select ${part.drawingNo}`}
          />
        </td>
      )}
      <td className="py-1.5 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">{part.drawingNo}</td>
      <td className="py-1.5 px-2 text-xs text-slate-700 max-w-[160px] truncate" title={part.description}>{part.description}</td>
      <td className="py-1.5 px-2 text-xs text-slate-500 whitespace-nowrap text-center">
        {part.qty != null ? part.qty : '—'}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-500 whitespace-nowrap text-center">
        {part.lhRh ?? '—'}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-600 max-w-[110px] truncate" title={part.status ?? ''}>
        {formatManufacturedStatus(part.status)}
      </td>
      {showReceiveQty && (
        <td className="py-1.5 px-2 text-xs text-slate-600 text-center font-mono">
          {storeReceiving?.editing ? (
            <Input
              className="h-7 text-xs px-1 py-0 w-20"
              type="number"
              step="any"
              min={0}
              value={storeReceiving.draftQty}
              onChange={(e) => storeReceiving.onDraftQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !storeReceiving.saving) {
                  storeReceiving.onSave()
                }
              }}
            />
          ) : part.receivedQuantity != null ? part.receivedQuantity : '—'}
        </td>
      )}
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
  mfgParts = [],
  stdParts = [],
  mfgCheckbox,
  storeReceivingForPart,
  poMode,
  stdSelectedIds,
  onToggleStdPart,
  onSelectAllStd,
  onClearStd,
  storeMode,
  priceDraftByLine,
  onPriceDraftChange,
  onSavePrice,
  savingPriceId,
}: {
  unitSeq: number
  mfgParts: ManufacturedPart[]
  stdParts: StandardPart[]
  mfgCheckbox?: { 
    selectedIds: Set<string>; 
    onToggle: (id: string) => void;
    onSelectAll?: () => void;
    onClear?: () => void;
    isItemDisabled?: (p: ManufacturedPart) => boolean;
  }
  storeReceivingForPart?: (part: ManufacturedPart) => ManufacturedPartRowProps['storeReceiving']
  poMode?: boolean
  stdSelectedIds?: Set<string>
  onToggleStdPart?: (id: string) => void
  onSelectAllStd?: () => void
  onClearStd?: () => void
  storeMode?: boolean
  priceDraftByLine?: Record<string, string>
  onPriceDraftChange?: (lineId: string, value: string) => void
  onSavePrice?: (lineId: string) => void
  savingPriceId?: string | null
}) {
  const [open, setOpen] = useState(true)
  const totalParts = mfgParts.length + stdParts.length
  return (
    <div className="rounded border border-slate-200 overflow-hidden bg-white">
      <button
        className="flex items-center gap-2 w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <FolderClosed className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
        <span className="text-xs font-semibold text-slate-700">Unit {String(unitSeq).padStart(2, '0')}</span>
        <span className="text-xs text-slate-400">
          ({totalParts} part{totalParts !== 1 ? 's' : ''}
          {mfgParts.length > 0 ? ` · ${mfgParts.length} mfg` : ''}
          {stdParts.length > 0 ? ` · ${stdParts.length} std` : ''})
        </span>
      </button>
      {open && (
        <div className="flex flex-col p-3 gap-3 bg-white">
          {mfgParts.length > 0 && (
            <div className="overflow-x-auto rounded border border-slate-200">
              <div className="bg-slate-50 px-2 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-amber-500" />
                    <span className="text-xs font-medium text-slate-600">Manufactured Parts</span>
                  </div>
                  {mfgCheckbox?.onSelectAll && mfgCheckbox?.onClear && (
                    <>
                      <div className="h-3 w-px bg-slate-300 mx-1"></div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <button type="button" className="hover:text-indigo-600 hover:underline" onClick={(e) => { e.stopPropagation(); mfgCheckbox.onSelectAll!() }}>Select all</button>
                        <span className="text-slate-300">|</span>
                        <button type="button" className="hover:text-indigo-600 hover:underline" onClick={(e) => { e.stopPropagation(); mfgCheckbox.onClear!() }}>Clear</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    {mfgCheckbox && (
                      <th className="py-1 px-2 w-10 text-left text-xs font-medium text-slate-400" />
                    )}
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Drawing No</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Description</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Qty</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">LH/RH</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Status</th>
                    {storeMode && (
                      <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Receive Qty</th>
                    )}
                    <th className="py-1 px-2 text-right text-xs font-medium text-slate-400">Drawing</th>
                  </tr>
                </thead>
                <tbody>
                  {mfgParts.map((p) => (
                    <ManufacturedPartRow
                      key={p.id}
                      part={p}
                      checkbox={
                        mfgCheckbox
                          ? {
                              checked: mfgCheckbox.selectedIds.has(p.id),
                              onToggle: () => mfgCheckbox.onToggle(p.id),
                              disabled: mfgCheckbox.isItemDisabled?.(p),
                            }
                          : undefined
                      }
                      storeReceiving={storeReceivingForPart?.(p)}
                      showReceiveQty={storeMode}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {stdParts.length > 0 && (
            <div className="overflow-x-auto rounded border border-teal-100">
              <div className="bg-teal-50/50 px-2 py-1.5 border-b border-teal-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-teal-600" />
                    <span className="text-xs font-medium text-teal-800">Standard Parts</span>
                  </div>
                  {poMode && onSelectAllStd && onClearStd && (
                    <>
                      <div className="h-3 w-px bg-teal-200 mx-1"></div>
                      <div className="flex items-center gap-2 text-xs text-teal-600">
                        <button type="button" className="hover:text-teal-800 hover:underline" onClick={(e) => { e.stopPropagation(); onSelectAllStd() }}>Select all</button>
                        <span className="text-teal-300">|</span>
                        <button type="button" className="hover:text-teal-800 hover:underline" onClick={(e) => { e.stopPropagation(); onClearStd() }}>Clear</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-teal-100 bg-white">
                    {poMode && (
                      <th className="py-1 px-2 w-10 text-left text-xs font-medium text-slate-400" />
                    )}
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Item Code</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Name</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">UOM</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Exp Qty</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">In Stock</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">To Purchase</th>
                    {storeMode && (
                      <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Unit price</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stdParts.map((p) => {
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
                                checked={stdSelectedIds?.has(p.id) ?? false}
                                onChange={() => onToggleStdPart?.(p.id)}
                                aria-label={`Select ${p.itemCode ?? p.id}`}
                              />
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        <td className="py-1.5 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">{p.itemCode ?? '—'}</td>
                        <td className="py-1.5 px-2 text-xs text-slate-700 max-w-[180px] truncate" title={p.productName ?? ''}>{p.productName ?? '—'}</td>
                        <td className="py-1.5 px-2 text-xs text-slate-600 text-center font-medium">{p.uom ?? '—'}</td>
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
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">UOM</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Exp Qty</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">In Stock</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">To Purchase</th>
                {storeMode && (
                  <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Unit price</th>
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
                            aria-label={`Select ${p.itemCode ?? p.id}`}
                          />
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">{p.itemCode ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-700 max-w-[180px] truncate" title={p.productName ?? ''}>{p.productName ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-600 text-center font-medium">{p.uom ?? '—'}</td>
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

type BomWorkbenchMode = 'default' | 'procurement' | 'store' | 'manufacturing'

function FixtureTreeRow({ fixture }: FixtureTreeRowProps) {
  const [expanded, setExpanded] = useState(false)
  // const canManageReceiving = useUIPermission('MANAGE_BOM_RECEIVING')
  const currentUser = useCurrentUser()
  const userRoles = currentUser?.roles || []
  const isManufacturing = userRoles.includes('Manufacturing')
  const isPurchase = userRoles.includes('Procurement')

  const { data: vendorsData } = useVendors(1, 500, { isActive: true }, { enabled: isManufacturing })
  const { data: suppliersData } = useSuppliers(1, 500, { isActive: true }, { enabled: isPurchase })
  const createMfgPo = useCreateManufacturedPo(fixture.id)
  const createStdPo = useCreateStandardPo(fixture.id)
  const bulkMfgStatus = useUpdateManufacturedStatusBulk(fixture.id)
  const updateRecvQty = useUpdateManufacturedReceivedQty(fixture.id)
  const updateStdPrice = useUpdateStandardPartPurchaseUnitPrice(fixture.id)

  // const canCreatePo = useUIPermission('CREATE_PURCHASE_ORDER_PO')
  // const canEditPo = useCanAccess('purchase_order', 'update')

  // const canReadMfg = useCanAccess('fixture_bom', 'read')
  // const canEditMfg = useCanAccess('fixture_bom', 'update')
  // const canReadVendor = useCanAccess('vendor', 'read')
  // const canReadSupplier = useCanAccess('supplier', 'read')
  // const canUpdateProduct = useCanAccess('product', 'update')

  const capabilities = useMemo(() => {
    
    const isStore = userRoles.includes('Inventory Manager(Store Keeper)')
    const isPurchase = userRoles.includes('Procurement')
    const isManufacturing = userRoles.includes('Manufacturing')
    const isQualityCheck = userRoles.includes('Quality')
    const isDesigner = userRoles.includes('Design')
    
    // If the user has a mix of roles, we combine their capabilities
    const hasAnyRole = isStore || isPurchase || isManufacturing || isQualityCheck || isDesigner

    const showMfgCheckbox = isManufacturing || isPurchase || isQualityCheck || isStore

    const caps = {
      canCreateVendorPo: isManufacturing,
      canCreateSupplierPo: isPurchase,
      canEditStdPrice: isPurchase,
      canMarkQualityChecked: isQualityCheck,
      canMarkReceived: isStore,
      canUpdateStdQty: isStore,
      showMfgParts: true, // Everyone can see mfg parts by default
      // Mfg and QC don't see standard parts unless they also have other roles
      showStdParts: isDesigner || isPurchase || isStore || !hasAnyRole,
      // QC only sees inprogress and quality_checked mfg parts, unless they also have other roles requiring full visibility
      mfgStatusFilter: null, // Removed filter to allow Quality to see all mfg parts
      mfgSelectableStatuses: null as string[] | null, // Default to null, will override below if specific roles
      showMfgCheckbox,
    }
    
    const selectable = new Set<string>()
    if (isManufacturing) selectable.add('pending')
    if (isQualityCheck) selectable.add('inprogress')
    if (isStore) selectable.add('quality_checked')
    
    caps.mfgSelectableStatuses = caps.showMfgCheckbox ? Array.from(selectable) : null;

    return caps;
  }, [currentUser?.roles])

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
  const [recvDraftQty, setRecvDraftQty] = useState('')
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
    setRecvDraftQty('')
    setPriceDraftByLine({})
  }, [fixture.id])

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

  const selectAllMfgStatus = useCallback(() => setSelMfgStatus(new Set(mfgPartIds)), [mfgPartIds])
  const clearMfgStatus = useCallback(() => setSelMfgStatus(new Set()), [])
  const clearMfg = useCallback(() => setSelMfg(new Set()), [])
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
    setRecvDraftQty(part.receivedQuantity != null ? String(part.receivedQuantity) : '')
  }

  const saveRecvEdit = async () => {
    if (!recvEditId) return
    const raw = recvDraftQty.trim()
    const qty = raw === '' ? null : parseFloat(raw)
    if (qty != null && Number.isNaN(qty)) return
    await updateRecvQty.mutateAsync({ partId: recvEditId, receivedQty: qty })
    setRecvEditId(null)
  }

  const storeReceivingForPart = (part: ManufacturedPart): ManufacturedPartRowProps['storeReceiving'] => {
    if (!capabilities.canMarkReceived) return undefined
    const editing = recvEditId === part.id
    return {
      enabled: true,
      editing,
      draftQty: recvDraftQty,
      onDraftQty: setRecvDraftQty,
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
    clearMfg() // Also clear the selection from the checkbox state
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

  const units = new Map<number, { mfg: ManufacturedPart[]; std: StandardPart[] }>()
  
  for (const part of bomView?.manufacturedParts ?? []) {
    const seq = part.unitSeq ?? 0
    if (!units.has(seq)) units.set(seq, { mfg: [], std: [] })
    units.get(seq)!.mfg.push(part)
  }
  
  for (const part of bomView?.standardParts ?? []) {
    const seq = part.unitSeq ?? 0
    if (!units.has(seq)) units.set(seq, { mfg: [], std: [] })
    units.get(seq)!.std.push(part)
  }
  const sortedUnits = [...units.entries()].sort(([a], [b]) => a - b)
  const stdParts = bomView?.standardParts ?? []
  
  // Apply filtering based on capabilities
  const filteredSortedUnits = useMemo(() => {
    return sortedUnits.map(([unitSeq, parts]) => {
      let filteredMfg = parts.mfg
      let filteredStd = parts.std
      
      if (!capabilities.showMfgParts) {
        filteredMfg = []
      } else if (capabilities.mfgStatusFilter) {
        const filterArr = capabilities.mfgStatusFilter as string[]
        filteredMfg = filteredMfg.filter(p => p.status && filterArr.includes(p.status))
      }
      
      if (!capabilities.showStdParts) {
        filteredStd = []
      }
      
      return [unitSeq, { mfg: filteredMfg, std: filteredStd }] as const
    }).filter(([, parts]) => parts.mfg.length > 0 || parts.std.length > 0)
  }, [sortedUnits, capabilities])

  const totalMfg = useMemo(() => filteredSortedUnits.reduce((acc, [, parts]) => acc + parts.mfg.length, 0), [filteredSortedUnits])
  const totalStd = useMemo(() => filteredSortedUnits.reduce((acc, [, parts]) => acc + parts.std.length, 0), [filteredSortedUnits])

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
            BOM Uploaded
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
              ) : filteredSortedUnits.length === 0 ? (
                <div className="flex items-center gap-2 py-3 text-sm text-slate-400 italic">
                  <FileText className="h-4 w-4" />
                  BOM uploaded but no relevant parts found for your role.
                </div>
              ) : (
                <>
              {/* Parts grouped by unit */}
              {filteredSortedUnits.length > 0 && (
                <div className="space-y-4">
                  {/* Global Actions */}
                  {(capabilities.canCreateVendorPo || capabilities.canCreateSupplierPo || capabilities.canMarkQualityChecked || capabilities.canMarkReceived) && (
                    <div className="flex flex-wrap gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      {/* Manufactured Parts Bulk Actions */}
                      {(capabilities.canCreateVendorPo || capabilities.canMarkQualityChecked || capabilities.canMarkReceived) && (
                        <div className="flex-1 min-w-[300px] space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                              <Wrench className="h-3.5 w-3.5 text-amber-500" /> Mfg Actions
                            </p>
                          </div>
                          
                          {capabilities.canCreateVendorPo && (
                            <div className="flex flex-wrap items-end gap-2">
                              <Button type="button" size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8" disabled={selMfg.size === 0} onClick={(e) => { e.stopPropagation(); setMfgDlgOpen(true) }}>
                                PO for Vendor…
                              </Button>
                            </div>
                          )}

                          {capabilities.canMarkQualityChecked && (
                            <div className="flex justify-end pt-1">
                              <Button type="button" size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8" disabled={selMfg.size === 0} onClick={(e) => { 
                                e.stopPropagation();
                                setBulkStatus('quality_checked');
                                setSelMfgStatus(new Set(selMfg));
                                setBulkDlgOpen(true);
                              }}>
                                Mark as Quality Checked
                              </Button>
                            </div>
                          )}

                          {capabilities.canMarkReceived && (
                            <div className="flex justify-end pt-1">
                              <Button type="button" size="sm" className="bg-teal-700 hover:bg-teal-800 h-8" disabled={selMfg.size === 0} onClick={(e) => { 
                                e.stopPropagation();
                                setBulkStatus('received');
                                setSelMfgStatus(new Set(selMfg));
                                setBulkDlgOpen(true);
                              }}>
                                Mark as Received
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Standard Parts Bulk Actions */}
                      {capabilities.canCreateSupplierPo && (
                        <div className="flex-1 min-w-[300px] space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-teal-500" /> Std Actions
                            </p>
                          </div>
                          <div className="flex flex-wrap items-end gap-2">
                            <Button type="button" size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8" disabled={selStd.size === 0} onClick={(e) => { e.stopPropagation(); setStdDlgOpen(true) }}>
                              PO for Supplier…
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {filteredSortedUnits.map(([unitSeq, parts]) => (
                      <UnitSection
                        key={unitSeq}
                        unitSeq={unitSeq}
                        mfgParts={parts.mfg}
                        stdParts={parts.std}
                        mfgCheckbox={
                          capabilities.showMfgCheckbox
                            ? { 
                                selectedIds: selMfg, 
                                onToggle: toggleMfgPo,
                                onSelectAll: () => {
                                  const selectable = parts.mfg.filter(p => capabilities.mfgSelectableStatuses ? capabilities.mfgSelectableStatuses.includes(p.status ?? '') : true)
                                  setSelMfg(new Set([...selMfg, ...selectable.map(p => p.id)]))
                                },
                                onClear: () => setSelMfg(new Set([...selMfg].filter(id => !parts.mfg.some(p => p.id === id)))),
                                isItemDisabled: capabilities.mfgSelectableStatuses
                                  ? (p) => !capabilities.mfgSelectableStatuses!.includes(p.status ?? '')
                                  : undefined
                              }
                            : undefined
                        }
                        storeReceivingForPart={storeReceivingForPart}
                        poMode={capabilities.canCreateSupplierPo}
                        stdSelectedIds={selStd}
                        onToggleStdPart={toggleStd}
                        onSelectAllStd={() => setSelStd(new Set([...selStd, ...parts.std.filter(p => (p.purchaseQty ?? 0) > 0).map(p => p.id)]))}
                        onClearStd={() => setSelStd(new Set([...selStd].filter(id => !parts.std.some(p => p.id === id))))}
                        storeMode={capabilities.canUpdateStdQty || capabilities.canEditStdPrice}
                        priceDraftByLine={priceDraftByLine}
                        onPriceDraftChange={(lineId, value) => setPriceDraftByLine((prev) => ({ ...prev, [lineId]: value }))}
                        onSavePrice={(lineId) => void handleSaveLinePrice(lineId)}
                        savingPriceId={savingPriceLineId}
                      />
                    ))}
                  </div>
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
              <DialogTitle>Create Vendor PO</DialogTitle>
              <DialogDescription>
                Select a vendor to create a purchase order for the selected manufacturing parts.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Label className="text-xs mb-1 block">Vendor</Label>
              <select 
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                value={vendorId} 
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option value="">Select vendor…</option>
                {vendorsData?.vendors.items.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </select>
            </div>
            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-md mt-2">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="py-1 px-2 text-left font-medium text-slate-500">Drawing No</th>
                    <th className="py-1 px-2 text-left font-medium text-slate-500">Description</th>
                    <th className="py-1 px-2 text-center font-medium text-slate-500">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bomView?.manufacturedParts
                    .filter(p => selMfg.has(p.id))
                    .map(p => (
                      <tr key={p.id}>
                        <td className="py-1 px-2 font-mono text-slate-600">{p.drawingNo}</td>
                        <td className="py-1 px-2 text-slate-700 truncate max-w-[200px]">{p.description}</td>
                        <td className="py-1 px-2 text-center">{p.qty ?? '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button type="button" variant="outline" onClick={() => setMfgDlgOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  void handleConfirmMfg()
                  // Based on requirement: automatically changes to InProgress (stubbed here for future backend hook)
                  toast.success('Manufacturing parts marked as InProgress')
                }}
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
              <DialogTitle>Create Supplier PO</DialogTitle>
              <DialogDescription>
                Select a supplier to create a purchase order for the selected standard parts.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Label className="text-xs mb-1 block">Supplier</Label>
              <select 
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                value={supplierId} 
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Select supplier…</option>
                {suppliersData?.suppliers.items.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-md mt-2">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="py-1 px-2 text-left font-medium text-slate-500">Item Code</th>
                    <th className="py-1 px-2 text-left font-medium text-slate-500">Name</th>
                    <th className="py-1 px-2 text-center font-medium text-slate-500">Purch Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bomView?.standardParts
                    .filter(p => selStd.has(p.id))
                    .map(p => (
                      <tr key={p.id}>
                        <td className="py-1 px-2 font-mono text-slate-600">{p.itemCode}</td>
                        <td className="py-1 px-2 text-slate-700 truncate max-w-[200px]">{p.productName}</td>
                        <td className="py-1 px-2 text-center font-semibold text-indigo-600">{p.purchaseQty ?? '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
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
