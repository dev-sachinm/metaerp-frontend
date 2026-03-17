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
import { FIXTURE_STATUS_LABELS, FIXTURE_STATUS_ORDER } from '@/types/design'
import type { FixtureStatus } from '@/types/design'

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
  const [status, setStatus] = useState<FixtureStatus>('design_pending')
  const [isActive, setIsActive] = useState(true)

  const updateFixture = useUpdateFixture(fixtureId ?? '', projectId)
  const deleteFixture = useDeleteFixture(projectId)

  useEffect(() => {
    if (fixture) {
      setDescription(fixture.description ?? '')
      setStatus(fixture.status as FixtureStatus)
      setIsActive(fixture.isActive)
    }
  }, [fixture])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await updateFixture.mutateAsync({ description: description.trim() || null, status, isActive })
      onClose()
    },
    [updateFixture, description, status, isActive, onClose]
  )

  const handleDelete = useCallback(async () => {
    if (!fixtureId) return
    if (!confirm(`Delete fixture "${fixture?.fixtureNumber}"? This cannot be undone.`)) return
    await deleteFixture.mutateAsync(fixtureId)
    onClose()
  }, [deleteFixture, fixtureId, fixture, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
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
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as FixtureStatus)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {FIXTURE_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{FIXTURE_STATUS_LABELS[s]}</option>
                ))}
              </select>
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

            {/* Audit info */}
            {fixture.bomFilename && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">
                📎 BOM: <span className="font-medium">{fixture.bomFilename}</span>
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
