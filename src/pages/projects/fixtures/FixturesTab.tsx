import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/Loader'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw } from 'lucide-react'
import { useFixtures } from '@/hooks/graphql/useDesign'
import { getErrorMessage } from '@/lib/graphqlErrors'
import { BomTree } from './BomTree'
import { AddFixtureModal } from './AddFixtureModal'
import { EditFixtureModal } from './EditFixtureModal'
import { FIXTURE_STAGE_ORDER, FIXTURE_STAGE_LABELS } from '@/types/design'
import type { FixtureStage } from '@/types/design'

const STAGE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All stages' },
  ...FIXTURE_STAGE_ORDER.map((s) => ({ value: s, label: FIXTURE_STAGE_LABELS[s] })),
]

interface Props {
  projectId: string
  projectName: string
  canCreate?: boolean
  canUpdate?: boolean
  projectStartDate?: string | null
}

export function FixturesTab({ projectId, projectName, canCreate = true, projectStartDate }: Props) {
  const [stageFilter, setStageFilter] = useState<string>('')
  const [showAdd, setShowAdd] = useState(false)
  const [editFixtureId, setEditFixtureId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useFixtures(
    projectId,
    stageFilter || undefined
  )

  const fixtures = data?.fixtures?.items ?? []
  const total = data?.fixtures?.total ?? 0

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {STAGE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStageFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                stageFilter === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Fixture
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader /></div>
      ) : isError ? (
        <div className="text-center py-10 text-amber-800 text-sm">
          {getErrorMessage(error, 'Failed to load fixtures')}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : fixtures.length === 0 ? (
        <div className="text-center py-14 text-slate-500">
          <p className="text-sm font-medium">
            {stageFilter ? `No fixtures at stage "${FIXTURE_STAGE_LABELS[stageFilter as FixtureStage]}"` : 'No fixtures yet'}
          </p>
          {!stageFilter && canCreate && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add the first fixture
            </Button>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">{total} fixture{total !== 1 ? 's' : ''}</Badge>
            {stageFilter && (
              <Badge variant="outline" className="text-indigo-600">
                Filtered: {FIXTURE_STAGE_LABELS[stageFilter as FixtureStage]}
              </Badge>
            )}
          </div>
          <BomTree
            projectId={projectId}
            projectName={projectName}
            fixtures={fixtures}
            projectStartDate={projectStartDate}
          />
        </div>
      )}

      {/* Modals */}
      <AddFixtureModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        projectId={projectId}
      />
      <EditFixtureModal
        fixtureId={editFixtureId}
        projectId={projectId}
        onClose={() => setEditFixtureId(null)}
      />
    </div>
  )
}
