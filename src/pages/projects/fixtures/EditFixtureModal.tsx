import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader } from '@/components/Loader'
import { useFixture, useUpdateFixture, useDeleteFixture } from '@/hooks/graphql/useDesign'
import { StageProgressBar } from '@/components/fixtures/StageProgressBar'
import { FIXTURE_STAGE_LABELS } from '@/types/design'

interface Props {
  fixtureId: string | null
  projectId: string
  onClose: () => void
}

export function EditFixtureModal({ fixtureId, projectId, onClose }: Props) {
  const open = !!fixtureId
  const { data, isLoading } = useFixture(fixtureId)
  const fixture = data?.fixture

  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const updateFixture = useUpdateFixture(fixtureId ?? '', projectId)
  const deleteFixture = useDeleteFixture(projectId)

  useEffect(() => {
    if (fixture) {
      setDescription(fixture.description ?? '')
      setIsActive(fixture.isActive)
    }
  }, [fixture])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await updateFixture.mutateAsync({ description: description.trim() || null, isActive })
      onClose()
    },
    [updateFixture, description, isActive, onClose]
  )

  const handleDelete = useCallback(async () => {
    if (!fixtureId) return
    if (!confirm(`Delete fixture "${fixture?.fixtureNumber}"? This cannot be undone.`)) return
    await deleteFixture.mutateAsync(fixtureId)
    onClose()
  }, [deleteFixture, fixtureId, fixture, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit Fixture
            {fixture && (
              <span className="ml-2 font-mono text-sm text-slate-500">{fixture.fixtureNumber}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader /></div>
        ) : !fixture ? (
          <p className="text-sm text-slate-500 py-4">Fixture not found.</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Stage progress bar (read-only) */}
            {fixture.stageInfo && fixture.stageInfo.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Current Stage: <span className="text-amber-600">{FIXTURE_STAGE_LABELS[fixture.stage] ?? fixture.stage}</span>
                </p>
                <StageProgressBar stageInfo={fixture.stageInfo} compact />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="edit-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>

            {fixture.bomFilename && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">
                BOM: <span className="font-medium">{fixture.bomFilename}</span>
                {fixture.bomUploadedAt && (
                  <> — {new Date(fixture.bomUploadedAt).toLocaleString()}</>
                )}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={deleteFixture.isPending}
                onClick={handleDelete}
              >
                {deleteFixture.isPending ? 'Deleting…' : 'Delete Fixture'}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={updateFixture.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateFixture.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {updateFixture.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
