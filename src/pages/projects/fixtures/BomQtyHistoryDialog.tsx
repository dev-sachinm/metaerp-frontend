import { useState, useEffect } from 'react'
import { History, ChevronDown, CheckCircle2, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/Loader'
import {
  useBomQtyHistory,
  useConfirmBomQtyCollection,
  type BomQtyEvent,
} from '@/hooks/graphql/useBomReceivingMutations'
import { useCurrentUser } from '@/stores/authStore'

const PAGE_SIZE = 25

// ── Note badge config ─────────────────────────────────────────────────────────
const NOTE_BADGE_CONFIG: Record<string, { label: string; cls: string }> = {
  'Received at Store':                 { label: 'Received at Store',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Collected by Assembly':             { label: 'Collected by Assembly',     cls: 'bg-green-50 text-green-700 border-green-200' },
  'Manual Adjustment':                 { label: 'Manual Adjustment',         cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Stock Updated from Product Master': { label: 'Stock from Product Master', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  // Enum-style keys (backward compat)
  RECEIVED_AT_STORE:      { label: 'Received at Store',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  COLLECTED_BY_ASSEMBLY:  { label: 'Collected by Assembly', cls: 'bg-green-50 text-green-700 border-green-200' },
  MANUAL_ADJUSTMENT:      { label: 'Manual Adjustment',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function QtyDisplay({ qty }: { qty: number }) {
  return (
    <span
      className={`text-xs font-semibold font-mono px-2 py-0.5 rounded-full border ${
        qty >= 0
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-red-50 text-red-700 border-red-200'
      }`}
    >
      {qty >= 0 ? '+' : ''}
      {qty.toFixed(2)}
    </span>
  )
}

function NoteBadge({ note }: { note: string }) {
  const cfg = NOTE_BADGE_CONFIG[note]
  if (!cfg) {
    return <span className="text-xs text-slate-500">{note || '—'}</span>
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Display label shown in the dialog header (drawing number or item code) */
  displayLabel: string
  /** Pass for manufactured parts */
  drawingNumber?: string | null
  /** Pass for standard parts — scopes history to that exact BOM row */
  fixtureBomId?: string | null
  /** Pass for standard parts when coming from product master */
  itemCode?: string | null
  kind: 'receive' | 'collect'
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BomQtyHistoryDialog({
  open,
  onOpenChange,
  displayLabel,
  drawingNumber,
  fixtureBomId,
  itemCode,
  kind,
}: Props) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  // Optimistic confirm overlay: eventId → confirmed fields
  const [optimisticConfirms, setOptimisticConfirms] = useState<
    Record<string, Partial<BomQtyEvent>>
  >({})
  // The eventId currently pending "Are you sure?" confirmation
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null)

  const currentUser = useCurrentUser()
  const isAssemblyRole = currentUser?.roles?.includes('Assembly') ?? false

  const { data, isLoading, isError } = useBomQtyHistory(
    { drawingNumber, fixtureBomId, itemCode },
    kind,
    limit,
    open,
  )
  const confirmMutation = useConfirmBomQtyCollection()

  // Reset pagination + optimistic state when dialog closes/reopens
  useEffect(() => {
    if (!open) {
      setLimit(PAGE_SIZE)
      setOptimisticConfirms({})
      setPendingConfirmId(null)
    }
  }, [open])

  // Merge optimistic confirms into query items
  const rawItems: BomQtyEvent[] = data?.bomQtyHistory.items ?? []
  const items: BomQtyEvent[] = rawItems.map((ev) =>
    optimisticConfirms[ev.id] ? { ...ev, ...optimisticConfirms[ev.id] } : ev,
  )
  const total = data?.bomQtyHistory.total ?? 0
  const hasMore = total > items.length

  // Live current stock — same for all events in the result set (last item's value)
  const currentStock = items.length > 0 ? items[0].currentStock : null
  // Show fixtureName column only when entries span multiple fixtures
  const fixtureNames = [...new Set(items.map((ev) => ev.fixtureName).filter(Boolean))]
  const showFixtureCol = fixtureNames.length > 1

  const handleConfirm = async () => {
    if (!pendingConfirmId || !currentUser?.id) return
    const result = await confirmMutation.mutateAsync({
      eventId: pendingConfirmId,
      confirmedByUserId: currentUser.id,
    })
    // Apply optimistic update so the row updates instantly without a full refetch flash
    setOptimisticConfirms((prev) => ({
      ...prev,
      [pendingConfirmId]: result.confirmBomQtyCollection,
    }))
    setPendingConfirmId(null)
  }

  const title = kind === 'receive' ? 'Receive History' : 'Collect History'
  const kindLabel = kind === 'receive' ? 'receive' : 'collect'
  const kindColor =
    kind === 'receive'
      ? 'text-green-700 bg-green-50 border-green-200'
      : 'text-indigo-700 bg-indigo-50 border-indigo-200'

  return (
    <>
      {/* ── Main history dialog ── */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={kind === 'collect' ? 'sm:max-w-4xl' : 'sm:max-w-2xl'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              {title}
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${kindColor}`}
              >
                {kindLabel}
              </span>
              <span className="ml-1 text-sm font-mono text-slate-500">{displayLabel}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Live stock context — shown after data loads */}
            {!isLoading && currentStock != null && (
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Current stock:
                <span className="font-semibold font-mono text-slate-800">{currentStock}</span>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader /> Loading history…
              </div>
            ) : isError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Failed to load history. Please try again.
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                No {kindLabel} history found for{' '}
                <span className="font-mono font-medium text-slate-600">{displayLabel}</span>.
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Showing {items.length} of {total} event{total !== 1 ? 's' : ''} — newest first
                </p>

                <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
                          Date &amp; Time
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                          Performed By
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                          Note
                        </th>
                        {showFixtureCol && (
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
                            Fixture
                          </th>
                        )}
                        {kind === 'collect' && (
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
                            Confirmation
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                            {fmtDateTime(ev.performedAt)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <QtyDisplay qty={ev.qty} />
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                            {ev.performedByUserName || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            <NoteBadge note={ev.note} />
                          </td>
                          {showFixtureCol && (
                            <td className="px-3 py-2 text-xs font-mono text-indigo-600 whitespace-nowrap">
                              {ev.fixtureName ?? '—'}
                            </td>
                          )}
                          {kind === 'collect' && (
                            <td className="px-3 py-2">
                              {ev.collectionConfirmedByAssembly ? (
                                <div className="flex items-start gap-1.5 text-green-600">
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium leading-tight">
                                      {ev.confirmedByUserName || '—'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                      {fmtDateTime(ev.confirmedAt)}
                                    </p>
                                  </div>
                                </div>
                              ) : isAssemblyRole ? (
                                <button
                                  type="button"
                                  title="Confirm this collection"
                                  onClick={() => setPendingConfirmId(ev.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Confirm
                                </button>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                                  Pending
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      Load more ({total - items.length} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── "Are you sure?" confirmation dialog ── */}
      <Dialog
        open={!!pendingConfirmId}
        onOpenChange={(v) => {
          if (!v && !confirmMutation.isPending) setPendingConfirmId(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              Confirm Collection?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to confirm this collection entry? Once confirmed it cannot be
              reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingConfirmId(null)}
              disabled={confirmMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
              onClick={() => void handleConfirm()}
              disabled={confirmMutation.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {confirmMutation.isPending ? 'Confirming…' : 'Yes, Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
