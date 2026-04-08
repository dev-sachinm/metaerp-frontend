import { useRef, useState } from 'react'
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useParseCostingExcel, useConfirmCosting, type CostingPreview } from '@/hooks/graphql/useCostingMutations'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  poId: string
}

type Step = 'upload' | 'preview'

export function CostingDialog({ open, onOpenChange, poId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<CostingPreview | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const parseMutation = useParseCostingExcel()
  const confirmMutation = useConfirmCosting(poId)

  const reset = () => {
    setStep('upload')
    setPreview(null)
    parseMutation.reset()
    confirmMutation.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      parseMutation.reset()
      // surface as a parse-step error via state
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const raw = e.target?.result as string
      // strip the data URL prefix — backend expects raw base64
      const fileBase64 = raw.split(',')[1]
      const result = await parseMutation.mutateAsync({ poId, fileBase64, filename: file.name })
      setPreview(result.parseCostingExcel)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleConfirm = async () => {
    if (!preview) return
    await confirmMutation.mutateAsync(preview.s3Key)
    handleClose(false)
  }

  const unmatchedCount = preview?.unmatchedDrawingNumbers.length ?? 0
  const matchedCount = (preview?.rows.length ?? 0) - unmatchedCount

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Costing</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500">
              Upload an Excel file (.xlsx / .xls) with drawing numbers and unit prices.
            </p>

            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                {parseMutation.isPending ? 'Parsing…' : 'Click or drag & drop to upload'}
              </span>
              <span className="text-xs text-slate-400">.xlsx or .xls only</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {parseMutation.isError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Failed to parse file. Please check the format and try again.
              </div>
            )}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {matchedCount} matched
              </div>
              {unmatchedCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  {unmatchedCount} unmatched — will be skipped
                </div>
              )}
            </div>

            {unmatchedCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Not found in PO: <span className="font-mono">{preview.unmatchedDrawingNumbers.join(', ')}</span>
              </p>
            )}

            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Drawing Number</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Total Cost</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className={row.matched ? 'hover:bg-slate-50' : 'bg-amber-50 hover:bg-amber-100'}>
                      <td className="px-3 py-2 font-mono text-indigo-600 font-medium">{row.drawingNumber}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.purchaseUnitPrice != null ? Number(row.purchaseUnitPrice).toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">{row.quantity ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.totalCost != null ? Number(row.totalCost).toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.matched
                          ? <Badge variant="secondary" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">matched</Badge>
                          : <Badge variant="secondary" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">unmatched</Badge>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'preview' && (
            <Button variant="ghost" size="sm" onClick={reset} disabled={confirmMutation.isPending}>
              Back
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={parseMutation.isPending || confirmMutation.isPending}>
            Cancel
          </Button>
          {step === 'preview' && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || matchedCount === 0}
            >
              {confirmMutation.isPending ? 'Applying…' : `Confirm & Apply (${matchedCount})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
