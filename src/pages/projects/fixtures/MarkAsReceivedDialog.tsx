import { useState, useEffect, useRef } from 'react'
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
import { useMarkBomPartsReceived, useUpdateManufacturedStatusBulk } from '@/hooks/graphql/useBomReceivingMutations'
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
  receivedQty: string
  needsStatusTransition: boolean
}

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

  // Snapshot props at open time so bomView refetch (after mutation) doesn't reset the dialog.
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
      receivedQty: p.receivedQuantity != null ? String(p.receivedQuantity) : '',
      needsStatusTransition: p.status === 'quality_checked',
    }))
    const stdRows: DraftRow[] = selectedStdParts.map((p) => ({
      fixtureBomId: p.id,
      drawingNo: p.itemCode ?? '—',
      description: p.productName ?? '—',
      partType: 'Standard',
      orderedQty: p.qty ?? null,
      currentReceived: null,
      receivedQty: '',
      needsStatusTransition: false,
    }))
    setRows([...mfgRows, ...stdRows])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const getRemaining = (row: DraftRow): number =>
    Math.max(0, (row.orderedQty ?? 0) - (row.currentReceived ?? 0))

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

  const handleUpdateNow = async () => {
    const items = rows
      .filter((r) => r.receivedQty.trim() !== '')
      .map((r) => ({
        fixtureBomId: r.fixtureBomId,
        receivedQty: parseFloat(r.receivedQty),
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

    await receiveMutation.mutateAsync(items)
    onOpenChange(false)
  }

  const isPending = receiveMutation.isPending || bulkStatusMutation.isPending
  const hasValidItems = rows.some(
    (r) => r.receivedQty.trim() !== '' && !Number.isNaN(parseFloat(r.receivedQty)) && parseFloat(r.receivedQty) >= 0,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Mark as Received</DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2">Drawing / Item</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-center">Part Type</th>
                <th className="px-3 py-2 text-center">Ordered Qty</th>
                <th className="px-3 py-2 text-center">Current Received</th>
                <th className="px-3 py-2 text-center">Received Qty</th>
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
                  <td className="px-3 py-2 text-center text-xs font-medium">{row.orderedQty ?? '—'}</td>
                  <td className="px-3 py-2 text-center text-xs font-medium">{row.currentReceived ?? '—'}</td>
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
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400 text-sm">
                    No items selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-teal-700 hover:bg-teal-800"
            onClick={() => void handleUpdateNow()}
            disabled={isPending || !hasValidItems}
          >
            {isPending ? 'Updating…' : 'Update Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
