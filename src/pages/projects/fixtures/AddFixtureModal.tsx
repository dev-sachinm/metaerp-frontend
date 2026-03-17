import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateFixture } from '@/hooks/graphql/useDesign'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
}

export function AddFixtureModal({ open, onClose, projectId }: Props) {
  const [description, setDescription] = useState('')
  const createFixture = useCreateFixture(projectId)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await createFixture.mutateAsync({ projectId, description: description.trim() || null })
      setDescription('')
      onClose()
    },
    [createFixture, projectId, description, onClose]
  )

  const handleClose = () => {
    setDescription('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fixture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="fixture-desc">Description <span className="text-slate-400 text-xs">(optional)</span></Label>
            <Input
              id="fixture-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Main body fixture"
            />
          </div>
          <p className="text-xs text-slate-500">
            Fixture number will be auto-generated (e.g. <span className="font-mono">S25049-001</span>).
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={createFixture.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createFixture.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createFixture.isPending ? 'Creating…' : 'Create Fixture'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
