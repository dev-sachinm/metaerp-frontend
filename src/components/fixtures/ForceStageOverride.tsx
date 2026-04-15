import { useState } from 'react'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FIXTURE_STAGE_ORDER, FIXTURE_STAGE_LABELS, type FixtureStage } from '@/types/design'

interface ForceStageOverrideProps {
  currentStage: FixtureStage
  isPending: boolean
  onForce: (stage: string) => Promise<void>
}

export function ForceStageOverride({ currentStage, isPending, onForce }: ForceStageOverrideProps) {
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleClick = () => {
    if (!selectedStage || selectedStage === currentStage) return
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    await onForce(selectedStage)
    setConfirmOpen(false)
    setSelectedStage('')
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
        value={selectedStage}
        onChange={(e) => setSelectedStage(e.target.value)}
      >
        <option value="">Force stage…</option>
        {FIXTURE_STAGE_ORDER.map((s) => (
          <option key={s} value={s} disabled={s === currentStage}>
            {FIXTURE_STAGE_LABELS[s]}{s === currentStage ? ' (current)' : ''}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        disabled={!selectedStage || selectedStage === currentStage || isPending}
        onClick={handleClick}
      >
        <Shield className="h-3 w-3" />
        Force
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Force Stage Override</DialogTitle>
            <DialogDescription>
              This will force the fixture to{' '}
              <span className="font-semibold text-slate-700">
                {FIXTURE_STAGE_LABELS[selectedStage as FixtureStage] ?? selectedStage}
              </span>
              . This is an admin action and will be audit-logged. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 gap-1.5"
              disabled={isPending}
              onClick={() => void handleConfirm()}
            >
              <Shield className="h-4 w-4" />
              {isPending ? 'Forcing…' : 'Confirm Force'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
