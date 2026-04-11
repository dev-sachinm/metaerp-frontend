import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
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
  Search,
  X,
} from 'lucide-react'
import { useBomView, type BomViewFilters } from '@/hooks/graphql/useDesignItemCode'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fetchDrawingViewUrl } from '@/hooks/graphql/useDesign'
import { useSuppliers, useVendors } from '@/hooks/graphql/useMasterDataQueries'
import { useCurrentUser } from '@/stores/authStore'
import { useCreateManufacturedPo, useCreateStandardPo } from '@/hooks/graphql/usePurchaseOrderMutations'
import { usePurchaseOrdersByFixture, useStandardPartsForPo } from '@/hooks/graphql/usePurchaseOrderQueries'
import {
  useUpdateManufacturedQty,
  useUpdateManufacturedReceivedQty,
  useUpdateManufacturedStatusBulk,
  useUpdateStandardPartPurchaseUnitPrice,
  useAssemblyUsers,
} from '@/hooks/graphql/useBomReceivingMutations'
import { MarkAsReceivedDialog } from './MarkAsReceivedDialog'
import { CollectByAssemblyDialog } from './CollectByAssemblyDialog'
import { useUIPermission, useCanAccess } from '@/hooks/usePermissions'
import { formatManufacturedStatus, MANUFACTURED_PART_STATUS_OPTIONS } from '@/lib/bomManufacturedStatuses'
import type { ManufacturedPart, StandardPart, FixtureSummary } from '@/types/design'
import { FIXTURE_STATUS_LABELS } from '@/types/design'
import type { FixtureStatus } from '@/types/design'

// ── Date range filter picker (compact inline) ─────────────────────────────────
interface DateRangeFilterProps {
  label: string
  color: string
  range: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

function DateRangeFilter({ label, color, range, onChange }: DateRangeFilterProps) {
  const hasValue = range?.from
  const display = range?.from
    ? range.to && range.to.getTime() !== range.from.getTime()
      ? `${format(range.from, 'dd MMM')}–${format(range.to, 'dd MMM')}`
      : format(range.from, 'dd MMM yy')
    : ''

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`w-full h-[30px] text-xs px-1.5 rounded border flex items-center gap-1 transition-colors
            ${hasValue
              ? `border-indigo-300 bg-indigo-50 ${color} font-medium`
              : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
            }`}
        >
          <Search className="h-3 w-3 shrink-0 opacity-50" />
          <span className="truncate flex-1 text-left">{display || label}</span>
          {hasValue && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(undefined) }}
              className="ml-auto shrink-0 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <Calendar
          mode="range"
          selected={range}
          onSelect={onChange}
          captionLayout="dropdown"
          numberOfMonths={1}
          defaultMonth={range?.from ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}

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

function fmtStatusDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

// ── Manufactured part row ─────────────────────────────────────────────────────
type ManufacturedPartRowProps = {
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
  qtyEditing?: {
    enabled: boolean
    editing: boolean
    draft: string
    onDraft: (v: string) => void
    onBeginEdit: () => void
    onSave: () => void
    onCancel: () => void
    saving: boolean
  }
  showReceiveQty?: boolean
  assemblyUserName?: string | null
}

function ManufacturedPartRow({
  part,
  checkbox,
  storeReceiving,
  qtyEditing,
  showReceiveQty,
  assemblyUserName,
}: ManufacturedPartRowProps) {
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
      <td className="py-1.5 px-2 text-xs whitespace-nowrap text-center">
        {qtyEditing?.editing ? (
          <span className="inline-flex items-center gap-1.5">
            <Input
              className="h-7 text-xs px-1.5 py-0 w-16 text-center border-indigo-400 ring-1 ring-indigo-300"
              type="number"
              step="any"
              min={0}
              value={qtyEditing.draft}
              onChange={(e) => qtyEditing.onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !qtyEditing.saving) qtyEditing.onSave()
                if (e.key === 'Escape') qtyEditing.onCancel()
              }}
              autoFocus
            />
            <button
              type="button"
              className="inline-flex items-center justify-center h-7 w-7 rounded bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400 disabled:opacity-40 transition-colors text-sm font-bold"
              disabled={qtyEditing.saving}
              onClick={qtyEditing.onSave}
              title="Save"
            >✓</button>
            <button
              type="button"
              className="inline-flex items-center justify-center h-7 w-7 rounded bg-slate-100 border border-slate-300 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors text-sm font-bold"
              onClick={qtyEditing.onCancel}
              title="Cancel"
            >✕</button>
          </span>
        ) : qtyEditing?.enabled ? (
          <button
            type="button"
            onClick={qtyEditing.onBeginEdit}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors group"
            title="Click to edit quantity"
          >
            <span>{part.qty != null ? part.qty : '—'}</span>
            <svg className="h-3 w-3 opacity-40 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16.414V19h2.586a2 2 0 001.414-.586l6.293-6.293" />
            </svg>
          </button>
        ) : (
          <span className="text-slate-500">{part.qty != null ? part.qty : '—'}</span>
        )}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-500 whitespace-nowrap text-center">
        {part.lhRh ?? '—'}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-600 max-w-[110px] truncate" title={part.status ?? ''}>
        {formatManufacturedStatus(part.status)}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-500 whitespace-nowrap">
        {fmtStatusDate(part.pendingAt) ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="py-1.5 px-2 text-xs text-blue-600 whitespace-nowrap">
        {fmtStatusDate(part.inprogressAt) ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="py-1.5 px-2 text-xs text-amber-600 whitespace-nowrap">
        {fmtStatusDate(part.qualityCheckedAt) ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="py-1.5 px-2 text-xs text-green-600 whitespace-nowrap">
        {fmtStatusDate(part.receivedAt) ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="py-1.5 px-2 text-xs text-center font-mono text-indigo-700">
        {part.collectedByassemblyQuantity != null ? part.collectedByassemblyQuantity : <span className="text-slate-300">—</span>}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-600 whitespace-nowrap max-w-[120px] truncate" title={assemblyUserName ?? ''}>
        {assemblyUserName || <span className="text-slate-300">—</span>}
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

// ── Unit section (inside a fixture) ──────────────────────────────────────────
function UnitSection({
  unitSeq,
  mfgParts = [],
  stdParts = [],
  mfgCheckbox,
  storeReceivingForPart,
  qtyEditingForPart,
  poMode,
  stdSelectedIds,
  onToggleStdPart,
  onSelectAllStd,
  onClearStd,
  showReceiveQtyCol,
  showPriceEditCol,
  priceDraftByLine,
  onPriceDraftChange,
  onSavePrice,
  savingPriceId,
  assemblyUserById,
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
  qtyEditingForPart?: (part: ManufacturedPart) => ManufacturedPartRowProps['qtyEditing']
  poMode?: boolean
  stdSelectedIds?: Set<string>
  onToggleStdPart?: (id: string) => void
  onSelectAllStd?: () => void
  onClearStd?: () => void
  showReceiveQtyCol?: boolean
  showPriceEditCol?: boolean
  priceDraftByLine?: Record<string, string>
  onPriceDraftChange?: (lineId: string, value: string) => void
  onSavePrice?: (lineId: string) => void
  savingPriceId?: string | null
  assemblyUserById?: Record<string, string>
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
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Pending Date</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">In Progress Date</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">QC Date</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Received Date</th>
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Collected Qty</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Assembly User</th>
                    {showReceiveQtyCol && (
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
                      qtyEditing={qtyEditingForPart?.(p)}
                      showReceiveQty={showReceiveQtyCol}
                      assemblyUserName={
                        p.collectedByUserId
                          ? (assemblyUserById?.[p.collectedByUserId] ?? p.collectedByUserId)
                          : null
                      }
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
                    <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Collected Qty</th>
                    <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Assembly User</th>
                    {showPriceEditCol && (
                      <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Unit price</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stdParts.map((p) => {
                    const purchaseQty = p.purchaseQty ?? 0
                    const needsPurchase = purchaseQty > 0
                    const stdAssemblyUser = p.collectedByUserId
                      ? (assemblyUserById?.[p.collectedByUserId] ?? p.collectedByUserId)
                      : null
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
                        <td className="py-1.5 px-2 text-xs text-center font-mono text-indigo-700">
                          {p.collectedByassemblyQuantity != null ? p.collectedByassemblyQuantity : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-xs text-slate-600 whitespace-nowrap max-w-[120px] truncate" title={stdAssemblyUser ?? ''}>
                          {stdAssemblyUser || <span className="text-slate-300">—</span>}
                        </td>
                        {showPriceEditCol && (
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
  const isManufacturing = userRoles.some(r => r === 'Manufacturing')
  const isPurchase = userRoles.some(r => r === 'Procurement')

  const { data: vendorsData } = useVendors(1, 500, { isActive: true }, { enabled: isManufacturing })
  const { data: suppliersData } = useSuppliers(1, 500, { isActive: true }, { enabled: isPurchase })
  const createMfgPo = useCreateManufacturedPo(fixture.id)
  const createStdPo = useCreateStandardPo(fixture.id)
  const bulkMfgStatus = useUpdateManufacturedStatusBulk(fixture.id)

  const updateMfgQty = useUpdateManufacturedQty(fixture.id)
  const updateStdPrice = useUpdateStandardPartPurchaseUnitPrice(fixture.id)

  // const canCreatePo = useUIPermission('CREATE_PURCHASE_ORDER_PO')
  // const canEditPo = useCanAccess('purchase_order', 'update')

  // const canReadMfg = useCanAccess('fixture_bom', 'read')
  // const canEditMfg = useCanAccess('fixture_bom', 'update')
  // const canReadVendor = useCanAccess('vendor', 'read')
  // const canReadSupplier = useCanAccess('supplier', 'read')
  // const canUpdateProduct = useCanAccess('product', 'update')

  const capabilities = useMemo(() => {
    
    const hasRole = (name: string) => userRoles.some(r => r === name)
    const isStore = hasRole('Inventory Manager(Store Keeper)')
    const isPurchase = hasRole('Procurement')
    const isManufacturing = hasRole('Manufacturing')
    const isQualityCheck = hasRole('Quality')
    const isDesigner = hasRole('Design')
    
    // If the user has a mix of roles, we combine their capabilities
    const hasAnyRole = isStore || isPurchase || isManufacturing || isQualityCheck || isDesigner

    const showMfgCheckbox = isManufacturing || isQualityCheck || isStore

    const caps = {
      canCreateVendorPo: isManufacturing,
      canCreateSupplierPo: isPurchase,
      canEditStdPrice: false,
      canMarkQualityChecked: isQualityCheck,
      canMarkReceived: isStore,
      canUpdateStdQty: isStore,
      canEditMfgQty: isDesigner,
      showMfgParts: !isPurchase,
      showStdParts: isDesigner || isPurchase || isStore || !hasAnyRole,
      // QC only sees inprogress and quality_checked mfg parts, unless they also have other roles requiring full visibility
      mfgStatusFilter: null, // Removed filter to allow Quality to see all mfg parts
      mfgSelectableStatuses: null as string[] | null, // Default to null, will override below if specific roles
      showMfgCheckbox,
    }
    
    const selectable = new Set<string>()
    if (isManufacturing) selectable.add('pending')
    if (isQualityCheck) selectable.add('inprogress')
    if (isStore) { selectable.add('quality_checked'); selectable.add('received') }
    
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
  const { data: stdPartsData, isLoading: stdPartsLoading, refetch: refetchStdParts } = useStandardPartsForPo(
    fixture.id,
    stdDlgOpen,
  )
  // Scope existing-POs query to the checked parts only (all of them, regardless of orderQty)
  const selectedPartIdsForPo = useMemo(
    () => (stdDlgOpen ? [...selStd] : undefined),
    [stdDlgOpen, selStd],
  )
  const { data: existingPosData, isLoading: existingPosLoading } = usePurchaseOrdersByFixture(
    fixture.id,
    'StandardPart',
    stdDlgOpen,
    selectedPartIdsForPo,
  )
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkDlgOpen, setBulkDlgOpen] = useState(false)
  const [qtyEditId, setQtyEditId] = useState<string | null>(null)
  const [qtyDraft, setQtyDraft] = useState('')
  const [priceDraftByLine, setPriceDraftByLine] = useState<Record<string, string>>({})
  const [savingPriceLineId, setSavingPriceLineId] = useState<string | null>(null)
  const [markReceivedOpen, setMarkReceivedOpen] = useState(false)
  const [collectAssemblyOpen, setCollectAssemblyOpen] = useState(false)

  const { data: assemblyUsersData } = useAssemblyUsers(capabilities.canMarkReceived)

  const assemblyUserById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const u of assemblyUsersData?.users.items ?? []) {
      map[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.id
    }
    return map
  }, [assemblyUsersData])

  const [filterDraft, setFilterDraft] = useState<BomViewFilters>({})
  const [filters, setFilters] = useState<BomViewFilters>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Date range state — keyed by field prefix
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>()
  const [inprogressRange, setInprogressRange] = useState<DateRange | undefined>()
  const [qcRange, setQcRange] = useState<DateRange | undefined>()
  const [receivedRange, setReceivedRange] = useState<DateRange | undefined>()

  const toIsoStart = (d: Date) => {
    const copy = new Date(d); copy.setHours(0, 0, 0, 0); return copy.toISOString()
  }
  const toIsoEnd = (d: Date) => {
    const copy = new Date(d); copy.setHours(23, 59, 59, 999); return copy.toISOString()
  }

  const applyDateRange = useCallback((
    setter: (r: DateRange | undefined) => void,
    fromKey: keyof BomViewFilters,
    toKey: keyof BomViewFilters,
    range: DateRange | undefined
  ) => {
    setter(range)
    setFilters((prev) => ({
      ...prev,
      [fromKey]: range?.from ? toIsoStart(range.from) : undefined,
      [toKey]: range?.to ? toIsoEnd(range.to) : range?.from ? toIsoEnd(range.from) : undefined,
    }))
  }, [])

  const updateFilter = useCallback((key: keyof BomViewFilters, value: string) => {
    setFilterDraft((prev) => ({ ...prev, [key]: value }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, [key]: value || undefined }))
    }, 400)
  }, [])

  const clearFilters = useCallback(() => {
    setFilterDraft({})
    setFilters({})
    setPendingRange(undefined)
    setInprogressRange(undefined)
    setQcRange(undefined)
    setReceivedRange(undefined)
  }, [])

  const activeFilterCount = Object.values(filters).filter(Boolean).length
    + (pendingRange?.from ? 1 : 0)
    + (inprogressRange?.from ? 1 : 0)
    + (qcRange?.from ? 1 : 0)
    + (receivedRange?.from ? 1 : 0)

  const { data, isLoading, isError, error } = useBomView(expanded ? fixture.id : null, filters, expanded)
  const bomView = data?.bomView

  const hasAnySelected = selMfg.size > 0 || selStd.size > 0

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
    setQtyEditId(null)
    setQtyDraft('')
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
    const freshResult = await refetchStdParts()
    const allFreshParts = freshResult.data?.standardPartsForPo ?? []
    // Only consider the user-selected parts
    const selectedFresh = allFreshParts.filter(p => selStd.has(p.id))
    const prevParts = (stdPartsData?.standardPartsForPo ?? []).filter(p => selStd.has(p.id))
    const hasChanged = selectedFresh.some(fp => {
      const prev = prevParts.find(p => p.id === fp.id)
      return prev && prev.orderQty !== fp.orderQty
    })
    if (hasChanged) {
      toast.info('Quantities updated due to recent changes')
    }
    const validParts = selectedFresh.filter(p => p.orderQty > 0)
    if (validParts.length === 0) {
      toast.info('All items are already fully ordered or in stock')
      return
    }
    const parts = validParts.map(p => ({ partId: p.id, orderedQty: p.orderQty }))
    await createStdPo.mutateAsync({ parts, supplierId })
    setStdDlgOpen(false)
  }


  const beginQtyEdit = (part: ManufacturedPart) => {
    setQtyEditId(part.id)
    setQtyDraft(part.qty != null ? String(part.qty) : '')
  }

  const saveQtyEdit = async () => {
    if (!qtyEditId) return
    const raw = qtyDraft.trim()
    const qty = parseFloat(raw)
    if (raw === '' || Number.isNaN(qty)) return
    await updateMfgQty.mutateAsync({ partId: qtyEditId, qty })
    setQtyEditId(null)
  }

  const qtyEditingForPart = (part: ManufacturedPart): ManufacturedPartRowProps['qtyEditing'] => {
    if (!capabilities.canEditMfgQty || (part.status ?? 'pending') !== 'pending') return undefined
    const editing = qtyEditId === part.id
    return {
      enabled: true,
      editing,
      draft: qtyDraft,
      onDraft: setQtyDraft,
      onBeginEdit: () => beginQtyEdit(part),
      onSave: () => void saveQtyEdit(),
      onCancel: () => setQtyEditId(null),
      saving: updateMfgQty.isPending,
    }
  }

  const storeReceivingForPart = (_part: ManufacturedPart): ManufacturedPartRowProps['storeReceiving'] => undefined

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

        {/* Active filter indicator */}
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
            <Search className="h-3 w-3" />
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </span>
        )}

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

                  {/* ── Filter bar ── */}
                  <div className="rounded border border-slate-200 bg-white overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60">
                          {/* Search icon / Reset button */}
                          <th className="px-2 py-1.5 text-left font-medium text-slate-400 whitespace-nowrap w-8">
                            <span className="flex items-center gap-1">
                              {activeFilterCount > 0
                                ? <button type="button" onClick={(e) => { e.stopPropagation(); clearFilters() }} className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"><X className="h-2.5 w-2.5" />Reset ({activeFilterCount})</button>
                                : <Search className="h-3 w-3 text-slate-400" />
                              }
                            </span>
                          </th>
                          {/* Drawing No — 160→144px (-10%), height 32→29px */}
                          <th className="py-1.5 w-[144px] min-w-[144px]">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Drawing No"
                                value={filterDraft.drawingNo ?? ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateFilter('drawingNo', e.target.value)}
                                style={{ height: '29px' }}
                                className="w-full text-xs border border-slate-200 rounded px-2 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white placeholder-slate-300"
                              />
                              {filterDraft.drawingNo && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); updateFilter('drawingNo', '') }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </th>
                          {/* Description — 220→198px (-10%), height 32→29px */}
                          <th className="pl-8 pr-1 py-1.5 min-w-[198px]">
                            <div className="relative">
                              <input type="text" placeholder="Description" value={filterDraft.drawingDesc ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => updateFilter('drawingDesc', e.target.value)} style={{ height: '29px' }} className="w-full text-xs border border-slate-200 rounded px-1.5 pr-5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white placeholder-slate-300" />
                              {filterDraft.drawingDesc && <button type="button" onClick={(e) => { e.stopPropagation(); updateFilter('drawingDesc', '') }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="h-2.5 w-2.5" /></button>}
                            </div>
                          </th>
                          {/* Qty / LH/RH / Status — spacers */}
                          <th className="px-1 py-1.5 w-10" />
                          <th className="px-1 py-1.5 w-10" />
                          <th className="px-1 py-1.5 w-20" />
                          {/* Pending Date — 133→106px (-20%) */}
                          <th className="py-1.5 min-w-[106px]">
                            <DateRangeFilter label="Pending Date" color="text-slate-600" range={pendingRange} onChange={(r) => applyDateRange(setPendingRange, 'pendingDateFrom', 'pendingDateTo', r)} />
                          </th>
                          {/* In Progress Date — 143→114px (-20%) */}
                          <th className="py-1.5 min-w-[114px]">
                            <DateRangeFilter label="In Progress Date" color="text-blue-600" range={inprogressRange} onChange={(r) => applyDateRange(setInprogressRange, 'inprogressDateFrom', 'inprogressDateTo', r)} />
                          </th>
                          {/* QC Date — 114→91px (-20%) */}
                          <th className="py-1.5 min-w-[91px]">
                            <DateRangeFilter label="QC Date" color="text-amber-600" range={qcRange} onChange={(r) => applyDateRange(setQcRange, 'qcDateFrom', 'qcDateTo', r)} />
                          </th>
                          {/* Received Date — 133→106px (-20%) */}
                          <th className="py-1.5 min-w-[106px]">
                            <DateRangeFilter label="Received Date" color="text-green-600" range={receivedRange} onChange={(r) => applyDateRange(setReceivedRange, 'receivedDateFrom', 'receivedDateTo', r)} />
                          </th>
                          {/* Std Item Code — 100→115px (+15%) */}
                          <th className="px-1 py-1.5 w-[115px] min-w-[115px]">
                            <div className="relative">
                              <input type="text" placeholder="Std Item Code" value={filterDraft.stdPartNo ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => updateFilter('stdPartNo', e.target.value)} className="w-full h-8 text-xs border border-slate-200 rounded px-1.5 pr-5 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white placeholder-slate-300" />
                              {filterDraft.stdPartNo && <button type="button" onClick={(e) => { e.stopPropagation(); updateFilter('stdPartNo', '') }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="h-2.5 w-2.5" /></button>}
                            </div>
                          </th>
                          {/* Std Name — 110→127px (+15%) */}
                          <th className="px-1 py-1.5 w-[127px] min-w-[127px]">
                            <div className="relative">
                              <input type="text" placeholder="Std Part Name" value={filterDraft.stdName ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => updateFilter('stdName', e.target.value)} className="w-full h-8 text-xs border border-slate-200 rounded px-1.5 pr-5 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white placeholder-slate-300" />
                              {filterDraft.stdName && <button type="button" onClick={(e) => { e.stopPropagation(); updateFilter('stdName', '') }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="h-2.5 w-2.5" /></button>}
                            </div>
                          </th>
                          {/* Std Make — 90→104px (+15%) */}
                          <th className="px-1 py-1.5 w-[104px] min-w-[104px]">
                            <div className="relative">
                              <input type="text" placeholder="Std Make" value={filterDraft.stdMake ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => updateFilter('stdMake', e.target.value)} className="w-full h-8 text-xs border border-slate-200 rounded px-1.5 pr-5 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white placeholder-slate-300" />
                              {filterDraft.stdMake && <button type="button" onClick={(e) => { e.stopPropagation(); updateFilter('stdMake', '') }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="h-2.5 w-2.5" /></button>}
                            </div>
                          </th>
                        </tr>
                      </thead>
                    </table>
                  </div>

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
                              <Button type="button" size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 gap-1.5" disabled={selMfg.size === 0} onClick={(e) => { e.stopPropagation(); setMfgDlgOpen(true) }}>
                                Create Draft PO
                                {selMfg.size > 0 && (
                                  <span className="inline-flex items-center justify-center rounded-full bg-white/25 text-white text-[10px] font-bold min-w-[16px] h-4 px-1">
                                    {selMfg.size}
                                  </span>
                                )}
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
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-teal-700 hover:bg-teal-800 h-8"
                                disabled={!hasAnySelected}
                                onClick={(e) => { e.stopPropagation(); setMarkReceivedOpen(true) }}
                              >
                                Mark as Received
                                {hasAnySelected && (
                                  <span className="inline-flex items-center justify-center rounded-full bg-white/25 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 ml-1.5">
                                    {selMfg.size + selStd.size}
                                  </span>
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 h-8"
                                disabled={!hasAnySelected}
                                onClick={(e) => { e.stopPropagation(); setCollectAssemblyOpen(true) }}
                              >
                                Collected by Assembly
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
                                  const selectable = parts.mfg.filter(p =>
                                    capabilities.mfgSelectableStatuses ? capabilities.mfgSelectableStatuses.includes(p.status ?? '') : true
                                  )
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
                        qtyEditingForPart={qtyEditingForPart}
                        poMode={capabilities.canCreateSupplierPo}
                        stdSelectedIds={selStd}
                        onToggleStdPart={toggleStd}
                        onSelectAllStd={() => setSelStd(new Set([...selStd, ...parts.std.filter(p => (p.purchaseQty ?? 0) > 0).map(p => p.id)]))}
                        onClearStd={() => setSelStd(new Set([...selStd].filter(id => !parts.std.some(p => p.id === id))))}
                        showReceiveQtyCol={capabilities.canUpdateStdQty}
                        showPriceEditCol={capabilities.canEditStdPrice}
                        priceDraftByLine={priceDraftByLine}
                        onPriceDraftChange={(lineId, value) => setPriceDraftByLine((prev) => ({ ...prev, [lineId]: value }))}
                        onSavePrice={(lineId) => void handleSaveLinePrice(lineId)}
                        savingPriceId={savingPriceLineId}
                        assemblyUserById={assemblyUserById}
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
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Draft PO</DialogTitle>
              <DialogDescription>
                Review the selected drawings, choose a vendor, then click <strong>Create PO</strong> to generate the purchase order.
              </DialogDescription>
            </DialogHeader>

            {/* Vendor selector */}
            <div className="py-2">
              <Label className="text-xs mb-1 block">Vendor <span className="text-red-500">*</span></Label>
              <select
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option value="">— Select vendor —</option>
                {vendorsData?.vendors.items.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Selected parts preview — all columns */}
            <div className="mt-1">
              <p className="text-xs font-medium text-slate-500 mb-1">
                Selected drawings ({selMfg.size})
              </p>
              <div className="max-h-[320px] overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2 text-left font-medium text-slate-500 whitespace-nowrap">Drawing No</th>
                      <th className="py-1.5 px-2 text-left font-medium text-slate-500">Description</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500 whitespace-nowrap">Qty</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500 whitespace-nowrap">LH / RH</th>
                      <th className="py-1.5 px-2 text-left font-medium text-slate-500 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bomView?.manufacturedParts
                      .filter(p => selMfg.has(p.id))
                      .map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2 font-mono text-slate-700 whitespace-nowrap">{p.drawingNo}</td>
                          <td className="py-1.5 px-2 text-slate-700 max-w-[220px] truncate" title={p.description ?? ''}>{p.description ?? '—'}</td>
                          <td className="py-1.5 px-2 text-center text-slate-600">{p.qty ?? '—'}</td>
                          <td className="py-1.5 px-2 text-center text-slate-600">{p.lhRh ?? '—'}</td>
                          <td className="py-1.5 px-2">
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border-slate-200">
                              {formatManufacturedStatus(p.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button type="button" variant="outline" onClick={() => setMfgDlgOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void handleConfirmMfg()}
                disabled={createMfgPo.isPending || !vendorId || selMfg.size === 0}
              >
                {createMfgPo.isPending ? 'Creating PO…' : 'Create PO'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {stdDlgOpen && (
        <Dialog open={stdDlgOpen} onOpenChange={setStdDlgOpen}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Supplier PO</DialogTitle>
              <DialogDescription>
                Review standard parts for this fixture. Quantities are auto-calculated. Select a supplier and click "Create PO".
              </DialogDescription>
            </DialogHeader>

            {/* Supplier picker */}
            <div className="py-2">
              <Label className="text-xs mb-1 block">Supplier <span className="text-red-500">*</span></Label>
              <select
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Select supplier…</option>
                {suppliersData?.suppliers.items.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>

            {/* Existing Open POs */}
            <div className="mt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                Existing Open POs
                {existingPosLoading && <span className="text-slate-400 font-normal normal-case">Loading…</span>}
              </p>
              {!existingPosLoading && (existingPosData?.purchaseOrdersByFixture.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-400 py-1">No existing POs for this fixture.</p>
              ) : (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-1.5 px-2 text-left font-medium text-slate-500">PO Number</th>
                        <th className="py-1.5 px-2 text-left font-medium text-slate-500">Supplier</th>
                        <th className="py-1.5 px-2 text-left font-medium text-slate-500">Status</th>
                        <th className="py-1.5 px-2 text-left font-medium text-slate-500">Date</th>
                        <th className="py-1.5 px-2 text-center font-medium text-slate-500">Order Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {existingPosLoading
                        ? [1, 2].map(i => (
                          <tr key={i}>
                            <td colSpan={5} className="py-1.5 px-2"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                          </tr>
                        ))
                        : existingPosData!.purchaseOrdersByFixture.map(po => {
                          const totalOrdered = po.lineItems.reduce((s, li) => s + (li.orderedQuantity ?? 0), 0)
                          const dateStr = po.createdAt
                            ? new Date(po.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'
                          return (
                            <tr key={po.id} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2 font-mono font-medium text-slate-700">{po.poNumber}</td>
                              <td className="py-1.5 px-2 text-slate-600">{po.supplierName ?? '—'}</td>
                              <td className="py-1.5 px-2">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                  po.poStatus === 'Completed'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : po.poStatus === 'CostingUpdated'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>{po.poStatus ?? 'Created'}</span>
                              </td>
                              <td className="py-1.5 px-2 text-slate-500">{dateStr}</td>
                              <td className="py-1.5 px-2 text-center font-semibold text-indigo-600">{totalOrdered}</td>
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Standard Parts table */}
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                Selected Parts ({selStd.size})
                {stdPartsLoading && <span className="text-slate-400 font-normal normal-case">Loading…</span>}
                {!stdPartsLoading && (
                  <span className="text-slate-400 font-normal normal-case">
                    — {(stdPartsData?.standardPartsForPo ?? []).filter(p => selStd.has(p.id) && p.orderQty > 0).length} to order
                  </span>
                )}
              </p>
              <div className="max-h-[280px] overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="py-1.5 px-2 text-left font-medium text-slate-500">Item Code</th>
                      <th className="py-1.5 px-2 text-left font-medium text-slate-500">Name</th>
                      <th className="py-1.5 px-2 text-left font-medium text-slate-500">Make</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500">UOM</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500">Expected</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500">In Stock</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500">Unit Price</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500">Open Orders</th>
                      <th className="py-1.5 px-2 text-center font-medium text-slate-500">Order Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stdPartsLoading
                      ? [1, 2, 3].map(i => (
                        <tr key={i}>
                          <td colSpan={9} className="py-2 px-2"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                        </tr>
                      ))
                      : (stdPartsData?.standardPartsForPo ?? []).filter(p => selStd.has(p.id)).map(p => {
                        const zeroOrder = p.orderQty <= 0
                        return (
                          <tr key={p.id} className={zeroOrder ? 'bg-red-50' : 'hover:bg-slate-50'}>
                            <td className={`py-1.5 px-2 font-mono whitespace-nowrap ${zeroOrder ? 'text-red-400' : 'text-slate-600'}`}>{p.itemCode ?? '—'}</td>
                            <td className={`py-1.5 px-2 max-w-[140px] truncate ${zeroOrder ? 'text-red-400' : 'text-slate-700'}`} title={p.productName ?? ''}>{p.productName ?? '—'}</td>
                            <td className={`py-1.5 px-2 ${zeroOrder ? 'text-red-400' : 'text-slate-500'}`}>{p.productMake ?? '—'}</td>
                            <td className={`py-1.5 px-2 text-center ${zeroOrder ? 'text-red-400' : 'text-slate-500'}`}>{p.uom ?? '—'}</td>
                            <td className={`py-1.5 px-2 text-center font-medium ${zeroOrder ? 'text-red-400' : 'text-slate-700'}`}>{p.expectedQty}</td>
                            <td className={`py-1.5 px-2 text-center ${zeroOrder ? 'text-red-400' : 'text-slate-500'}`}>{p.currentStock}</td>
                            <td className={`py-1.5 px-2 text-center ${zeroOrder ? 'text-red-400' : 'text-slate-500'}`}>
                              {p.purchaseUnitPrice != null ? p.purchaseUnitPrice.toFixed(2) : '—'}
                            </td>
                            <td className={`py-1.5 px-2 text-center ${zeroOrder ? 'text-red-400' : 'text-slate-500'}`}>{p.openOrderQty > 0 ? p.openOrderQty : '—'}</td>
                            <td className={`py-1.5 px-2 text-center font-semibold ${zeroOrder ? 'text-red-500' : 'text-indigo-600'}`}>{p.orderQty}</td>
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </table>
              </div>
              {!stdPartsLoading && (stdPartsData?.standardPartsForPo ?? []).some(p => selStd.has(p.id) && p.orderQty <= 0) && (
                <p className="text-[10px] text-red-500 mt-1">Red rows have nothing left to order and will be skipped.</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button type="button" variant="outline" onClick={() => setStdDlgOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void handleConfirmStd()}
                disabled={createStdPo.isPending || !supplierId || stdPartsLoading}
              >
                {createStdPo.isPending ? 'Creating…' : 'Create PO'}
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

      {markReceivedOpen && (
        <MarkAsReceivedDialog
          open={markReceivedOpen}
          onOpenChange={(v) => { setMarkReceivedOpen(v); if (!v) { clearMfg(); clearStd() } }}
          selectedMfgParts={(bomView?.manufacturedParts ?? []).filter((p) => selMfg.has(p.id))}
          selectedStdParts={(bomView?.standardParts ?? []).filter((p) => selStd.has(p.id))}
          fixtureId={fixture.id}
        />
      )}

      {collectAssemblyOpen && (
        <CollectByAssemblyDialog
          open={collectAssemblyOpen}
          onOpenChange={(v) => { setCollectAssemblyOpen(v); if (!v) { clearMfg(); clearStd() } }}
          eligibleMfgParts={(bomView?.manufacturedParts ?? []).filter(
            (p) => selMfg.has(p.id) && p.status === 'received' && (p.receivedQuantity ?? 0) > 0,
          )}
          eligibleStdParts={(bomView?.standardParts ?? []).filter(
            (p) => selStd.has(p.id) && (p.qty ?? 0) > 0,
          )}
          assemblyUsers={assemblyUsersData?.users.items ?? []}
          fixtureId={fixture.id}
        />
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
