import { useState, useEffect, useRef } from 'react'
import { Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useCollectByAssembly, type AssemblyUser } from '@/hooks/graphql/useBomReceivingMutations'
import type { ManufacturedPart, StandardPart } from '@/types/design'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  eligibleMfgParts: ManufacturedPart[]
  eligibleStdParts: StandardPart[]
  assemblyUsers: AssemblyUser[]
  fixtureId: string
}

interface CollectRow {
  fixtureBomId: string
  label: string
  description: string
  partType: 'Manufactured' | 'Standard'
  availableQty: number | null
  alreadyCollected: number | null
  collectNow: string
}

export function CollectByAssemblyDialog({
  open,
  onOpenChange,
  eligibleMfgParts,
  eligibleStdParts,
  assemblyUsers,
  fixtureId,
}: Props) {
  const collectMutation = useCollectByAssembly(fixtureId)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [rows, setRows] = useState<CollectRow[]>([])
  const [downloadUrl, setDownloadUrl] = useState('')
  const [hasDownloaded, setHasDownloaded] = useState(false)

  // Snapshot props at the moment the dialog opens so that a bomView
  // refetch (triggered by the mutation's onSuccess invalidation) doesn't
  // reset dialog state mid-session.
  const initPartsRef = useRef({ mfg: eligibleMfgParts, std: eligibleStdParts })

  useEffect(() => {
    if (!open) return
    // Capture the current props only on open
    initPartsRef.current = { mfg: eligibleMfgParts, std: eligibleStdParts }
    setSelectedUserId('')
    setDownloadUrl('')
    setHasDownloaded(false)
    collectMutation.reset()

    const mfgRows: CollectRow[] = eligibleMfgParts.map((p) => ({
      fixtureBomId: p.id,
      label: p.drawingNo,
      description: p.description,
      partType: 'Manufactured',
      availableQty: p.receivedQuantity ?? null,
      alreadyCollected: p.collectedByassemblyQuantity ?? null,
      collectNow: '',
    }))
    const stdRows: CollectRow[] = eligibleStdParts.map((p) => ({
      fixtureBomId: p.id,
      label: p.itemCode ?? '—',
      description: p.productName ?? '—',
      partType: 'Standard',
      availableQty: p.qty ?? null,
      alreadyCollected: p.collectedByassemblyQuantity ?? null,
      collectNow: '',
    }))
    setRows([...mfgRows, ...stdRows])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const getRemaining = (row: CollectRow): number =>
    Math.max(0, (row.availableQty ?? 0) - (row.alreadyCollected ?? 0))

  const handleCollectChange = (index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      const row = next[index]
      const remaining = getRemaining(row)
      const num = parseFloat(value)
      const clamped =
        value.trim() === '' ? '' : String(Math.min(isNaN(num) ? 0 : num, remaining))
      next[index] = { ...next[index], collectNow: clamped }
      return next
    })
  }

  const handleNext = async () => {
    if (!selectedUserId) return

    const items = rows
      .filter((r) => r.collectNow.trim() !== '')
      .map((r) => ({
        fixtureBomId: r.fixtureBomId,
        collectedQuantity: parseFloat(r.collectNow),
      }))
      .filter((r) => !Number.isNaN(r.collectedQuantity) && r.collectedQuantity > 0)

    if (items.length === 0) return

    const result = await collectMutation.mutateAsync({
      collectedByUserId: selectedUserId,
      items,
    })
    setDownloadUrl(result.collectByAssembly.downloadUrl)
  }

  const handleDownload = () => {
    if (!downloadUrl) return
    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', 'CollectByAssembly.xlsx')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setHasDownloaded(true)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const hasValidItems = rows.some(
    (r) => r.collectNow.trim() !== '' && !Number.isNaN(parseFloat(r.collectNow)) && parseFloat(r.collectNow) > 0,
  )

  const submitted = !!downloadUrl

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Collected by Assembly</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {submitted && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <Download className="h-4 w-4 shrink-0" />
              Collection recorded successfully. Download the Excel report below.
            </div>
          )}

          <div>
            <Label className="text-xs mb-1 block">
              Assembly User <span className="text-red-500">*</span>
            </Label>
            <select
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={submitted}
            >
              <option value="">— Select assembly user —</option>
              {assemblyUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.id}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[350px] overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2">Drawing / Item</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-center">Part Type</th>
                  <th className="px-3 py-2 text-center">Available Qty</th>
                  <th className="px-3 py-2 text-center">Already Collected</th>
                  <th className="px-3 py-2 text-center">Collect Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={row.fixtureBomId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs text-indigo-600 font-medium whitespace-nowrap">
                      {row.label}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700 max-w-[160px] truncate" title={row.description}>
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
                    <td className="px-3 py-2 text-center text-xs font-medium">
                      {row.availableQty ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-medium font-mono">
                      {row.alreadyCollected ?? 0}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        className="h-7 text-xs px-1.5 py-0 w-20 text-center mx-auto"
                        type="number"
                        step="any"
                        min={0}
                        max={getRemaining(row)}
                        value={row.collectNow}
                        onChange={(e) => handleCollectChange(i, e.target.value)}
                        placeholder="0"
                        disabled={submitted || getRemaining(row) <= 0}
                      />
                      {getRemaining(row) <= 0 ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">fully collected</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5">max {getRemaining(row)}</p>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400 text-sm">
                      No eligible items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {submitted ? (
            <>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" /> Download Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={!hasDownloaded}
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleClose} disabled={collectMutation.isPending}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => void handleNext()}
                disabled={collectMutation.isPending || !selectedUserId || !hasValidItems}
              >
                {collectMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
