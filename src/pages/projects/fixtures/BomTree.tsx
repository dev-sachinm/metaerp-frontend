import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/Loader'
import { Input } from '@/components/ui/input'
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
import { useBomView, fetchDrawingViewUrl, type BomViewFilters } from '@/hooks/graphql/useDesign'
import type { ManufacturedPart, StandardPart, FixtureSummary } from '@/types/design'
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
function ManufacturedPartRow({ part }: { part: ManufacturedPart }) {
  const status = part.status ?? ''
  let statusClass =
    'bg-slate-50 text-slate-600 border-slate-200'
  if (status.toLowerCase() === 'pending') {
    statusClass = 'bg-orange-50 text-orange-700 border-orange-200'
  } else if (status.toLowerCase() === 'inprogress' || status.toLowerCase() === 'in progress') {
    statusClass = 'bg-yellow-50 text-yellow-700 border-yellow-200'
  } else if (status.toLowerCase() === 'quality checked') {
    statusClass = 'bg-purple-50 text-purple-700 border-purple-200'
  } else if (status.toLowerCase() === 'received') {
    statusClass = 'bg-green-50 text-green-700 border-green-200'
  }
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className="py-1.5 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">{part.drawingNo}</td>
      <td className="py-1.5 px-2 text-xs text-slate-700 max-w-[200px] truncate" title={part.description}>{part.description}</td>
      <td className="py-1.5 px-2 text-xs text-slate-500 whitespace-nowrap text-center">
        {part.status ? (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
            {part.status}
          </span>
        ) : '—'}
      </td>
      <td className="py-1.5 px-2 text-xs text-slate-500 whitespace-nowrap text-center">
        {part.qtyLh != null || part.qtyRh != null ? (
          <span>
            {part.qtyLh != null && <span className="text-slate-600">LH:{part.qtyLh}</span>}
            {part.qtyLh != null && part.qtyRh != null && <span className="text-slate-300 mx-1">|</span>}
            {part.qtyRh != null && <span className="text-slate-600">RH:{part.qtyRh}</span>}
          </span>
        ) : '—'}
      </td>
      <td className="py-1.5 px-2 text-right">
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
function UnitSection({ unitSeq, parts }: { unitSeq: number; parts: ManufacturedPart[] }) {
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
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Drawing No</th>
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Description</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Status</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Qty</th>
                <th className="py-1 px-2 text-right text-xs font-medium text-slate-400">Drawing</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <ManufacturedPartRow key={p.id} part={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Standard parts section ────────────────────────────────────────────────────
function StandardPartsSection({ parts }: { parts: StandardPart[] }) {
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
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Part No</th>
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Name</th>
                <th className="py-1 px-2 text-left text-xs font-medium text-slate-400">Make</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">Exp Qty</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">In Stock</th>
                <th className="py-1 px-2 text-center text-xs font-medium text-slate-400">To Purchase</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => {
                const purchaseQty = p.purchaseQty ?? 0
                const needsPurchase = purchaseQty > 0
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-teal-50/40 transition-colors">
                    <td className="py-1.5 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">{p.partNo ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-700 max-w-[180px] truncate" title={p.productName ?? ''}>{p.productName ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-500">{p.productMake ?? '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-600 text-center font-medium">
                      {p.expectedQty != null ? p.expectedQty : p.qty}
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
  searchFilters?: BomViewFilters
}

function FixtureTreeRow({ fixture, searchFilters }: FixtureTreeRowProps) {
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading, isError, error } = useBomView(
    expanded ? fixture.id : null,
    expanded,
    searchFilters
  )
  const bomView = data?.bomView
  const hasFilters =
    !!searchFilters &&
    (!!searchFilters.drawingNo ||
      !!searchFilters.drawingDesc ||
      !!searchFilters.stdPartNo ||
      !!searchFilters.stdName ||
      !!searchFilters.stdMake)

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

        {/* BOM state (do not show raw filename) */}
        {fixture.bomFilename ? (
          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            BOM uploaded
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
                  {hasFilters
                    ? 'No parts match the current search filters.'
                    : 'BOM uploaded but no parts found. The BOM may be empty.'}
                </div>
              ) : (
                <>
              {/* Manufactured parts grouped by unit */}
              {sortedUnits.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-500" />
                    Manufactured Parts ({totalMfg})
                  </p>
                  <div className="space-y-2">
                    {sortedUnits.map(([unitSeq, parts]) => (
                      <UnitSection key={unitSeq} unitSeq={unitSeq} parts={parts} />
                    ))}
                  </div>
                </div>
              )}

              {/* Standard parts */}
              {stdParts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-teal-500" />
                    Standard Parts ({totalStd})
                  </p>
                  <StandardPartsSection parts={stdParts} />
                </div>
              )}
                </>
              )}
            </>
          )}
        </div>
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
  const [filters, setFilters] = useState<BomViewFilters>({
    drawingNo: '',
    drawingDesc: '',
    stdPartNo: '',
    stdName: '',
    stdMake: '',
  })

  const hasAnyFilter =
    !!filters.drawingNo ||
    !!filters.drawingDesc ||
    !!filters.stdPartNo ||
    !!filters.stdName ||
    !!filters.stdMake

  const searchFilters: BomViewFilters | undefined = hasAnyFilter
    ? {
        drawingNo: filters.drawingNo || undefined,
        drawingDesc: filters.drawingDesc || undefined,
        stdPartNo: filters.stdPartNo || undefined,
        stdName: filters.stdName || undefined,
        stdMake: filters.stdMake || undefined,
      }
    : undefined

  const content = (
    <>
      <div className="mb-3 grid gap-2 md:grid-cols-5">
        <Input
          value={filters.drawingNo ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, drawingNo: e.target.value }))}
          placeholder="Drawing no"
          className="h-8 text-xs"
        />
        <Input
          value={filters.drawingDesc ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, drawingDesc: e.target.value }))}
          placeholder="Drawing description"
          className="h-8 text-xs"
        />
        <Input
          value={filters.stdPartNo ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, stdPartNo: e.target.value }))}
          placeholder="Std part no"
          className="h-8 text-xs"
        />
        <Input
          value={filters.stdName ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, stdName: e.target.value }))}
          placeholder="Std name"
          className="h-8 text-xs"
        />
        <Input
          value={filters.stdMake ?? ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, stdMake: e.target.value }))}
          placeholder="Std make"
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-2">
        {fixtures.map((f) => (
          <FixtureTreeRow key={f.id} fixture={f} projectId={projectId} searchFilters={searchFilters} />
        ))}
      </div>
    </>
  )

  if (!showRoot) return content

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
          {content}
        </div>
      )}
    </div>
  )
}
