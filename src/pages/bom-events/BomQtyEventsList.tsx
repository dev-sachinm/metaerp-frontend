import { useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Search, X, Camera, CheckCircle2,
} from 'lucide-react'
import { useAllBomQtyEvents } from '@/hooks/graphql/useBomReceivingMutations'
import { useDebounce } from '@/hooks/useDebounce'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/Loader'

const PAGE_SIZE = 25

// ── Inline photo viewer modal ─────────────────────────────────────────────────
function InvoicePhotoModal({
  downloadUrl,
  onClose,
}: {
  downloadUrl: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-700">
            <Camera className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-semibold">Invoice Photo</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex items-center justify-center bg-slate-50">
          <img
            src={downloadUrl}
            alt="Invoice"
            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow"
          />
        </div>

        {/* Footer — open in new tab */}
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
          >
            Open full size ↗
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function BomQtyEventsList() {
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState<'receive' | 'collect' | ''>('')
  const [drawingSearch, setDrawingSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const debouncedDrawing = useDebounce(drawingSearch, 400)
  const debouncedInvoice = useDebounce(invoiceSearch, 400)

  const skip = (page - 1) * PAGE_SIZE
  const hasFilters = kind || drawingSearch || invoiceSearch

  function resetPage() { setPage(1) }
  function clearAll() {
    setKind('')
    setDrawingSearch('')
    setInvoiceSearch('')
    setPage(1)
  }

  const { data, isLoading, isError, error } = useAllBomQtyEvents(
    {
      kind: kind || null,
      drawingNumber: debouncedDrawing || null,
      itemCode: debouncedDrawing || null,
    },
    skip,
    PAGE_SIZE,
  )

  const result = data?.bomQtyHistory
  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : skip + 1
  const to = Math.min(skip + PAGE_SIZE, total)
  const isFirst = page <= 1
  const isLast = page >= totalPages

  // Client-side invoice number filter (backend bomQtyHistory doesn't expose it as a filter)
  const filteredItems = debouncedInvoice.trim()
    ? items.filter((e) =>
        e.invoiceNumber?.toLowerCase().includes(debouncedInvoice.toLowerCase()),
      )
    : items

  const noteLabel = (note: string) => {
    switch (note) {
      case 'RECEIVED_AT_STORE': return 'Received at Store'
      case 'COLLECTED_BY_ASSEMBLY': return 'Collected by Assembly'
      case 'MANUAL_ADJUSTMENT': return 'Manual Adjustment'
      case 'STOCK_UPDATED_FROM_PRODUCT_MASTER': return 'Stock Update'
      default: return note.replace(/_/g, ' ')
    }
  }

  const PaginationBar = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={`px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${position === 'bottom' ? 'border-t' : 'border-b'} border-slate-200`}>
      <span className="text-sm text-slate-600">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={isFirst}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={isFirst}>
          <ChevronLeft className="h-4 w-4" />Prev
        </Button>
        <span className="px-3 text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={isLast}>
          Next<ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={isLast}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Receive &amp; Collect Events</h1>
          <p className="text-sm text-slate-500 mt-1">
            Full history of BOM quantity events — goods received at store and collected by assembly.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={drawingSearch}
              onChange={(e) => { setDrawingSearch(e.target.value); resetPage() }}
              placeholder="Search drawing / item code…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={invoiceSearch}
              onChange={(e) => { setInvoiceSearch(e.target.value); resetPage() }}
              placeholder="Search invoice number…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Event type:</label>
            <select
              value={kind}
              onChange={(e) => { setKind(e.target.value as typeof kind); resetPage() }}
              className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[150px]"
            >
              <option value="">All</option>
              <option value="receive">Receive</option>
              <option value="collect">Collect</option>
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
          {result && <PaginationBar position="top" />}

          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader /></div>
          ) : isError ? (
            <div className="p-12 text-center text-red-500">
              Failed to load events: {(error as Error)?.message}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              {hasFilters ? 'No events match your filters.' : 'No events recorded yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Event</th>
                    <th className="px-4 py-3 whitespace-nowrap">Drawing / Item</th>
                    <th className="px-4 py-3">Fixture</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-center">Part Type</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3">Invoice No.</th>
                    <th className="px-4 py-3 text-center">Photo</th>
                    <th className="px-4 py-3">Performed By</th>
                    <th className="px-4 py-3 whitespace-nowrap">Performed At</th>
                    <th className="px-4 py-3 text-center">Confirmed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold uppercase tracking-wide ${
                            event.kind === 'receive'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-violet-50 text-violet-700 border-violet-200'
                          }`}
                        >
                          {event.kind}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-medium whitespace-nowrap">
                        {event.drawingNumber || event.itemCode || '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[120px] truncate" title={event.fixtureName ?? ''}>
                        {event.fixtureName ?? '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-700 text-xs max-w-[160px] truncate" title={event.productName ?? ''}>
                        {event.productName ?? '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {event.partType ? (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              event.partType === 'manufactured'
                                ? 'text-amber-700 bg-amber-50 border-amber-200'
                                : 'text-teal-700 bg-teal-50 border-teal-200'
                            }`}
                          >
                            {event.partType === 'manufactured' ? 'Mfg' : 'Std'}
                          </Badge>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold tabular-nums ${event.qty >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {event.qty >= 0 ? '+' : ''}{event.qty}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {noteLabel(event.note)}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-700 font-mono whitespace-nowrap">
                        {event.invoiceNumber ?? <span className="text-slate-300">—</span>}
                      </td>

                      {/* Invoice photo — camera button if download URL is available */}
                      <td className="px-4 py-3 text-center">
                        {event.invoicePhotoDownloadUrl ? (
                          <button
                            type="button"
                            title="View invoice photo"
                            onClick={() => setPhotoUrl(event.invoicePhotoDownloadUrl!)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 hover:text-teal-800 transition-colors mx-auto"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {event.performedByUserName || event.performedByUserId || '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {event.performedAt
                          ? format(new Date(event.performedAt), 'dd MMM yyyy, HH:mm')
                          : '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {event.kind === 'collect' ? (
                          event.collectionConfirmedByAssembly ? (
                            <span title={`Confirmed by ${event.confirmedByUserName ?? ''}`}>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Pending</span>
                          )
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result && items.length > 0 && <PaginationBar position="bottom" />}
        </div>
      </div>

      {/* Invoice photo lightbox */}
      {photoUrl && (
        <InvoicePhotoModal
          downloadUrl={photoUrl}
          onClose={() => setPhotoUrl(null)}
        />
      )}
    </DashboardLayout>
  )
}
