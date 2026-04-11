import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader } from '@/components/Loader'
import { useDebounce } from '@/hooks/useDebounce'
import { useProjects, useDeleteProject } from '@/hooks/graphql/useProjectAssignments'
import { useFixtures } from '@/hooks/graphql/useDesign'
import { useExportBomViewExcelItemCode } from '@/hooks/graphql/useDesignItemCodeExport'
import { getErrorMessage } from '@/lib/graphqlErrors'
import { useEntityActions, useUIPermission } from '@/hooks/usePermissions'
import { BomTree } from './fixtures/BomTree'
import { BomUploadWizard } from './fixtures/BomUploadWizard'
import { CreateProjectModal } from './CreateProjectModal'
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FolderClosed,
  FolderOpen,
  Plus,
  Eye,
  Pencil,
  Users,
  RefreshCw,
  Trash2,
  Upload,
  Download,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import type { ProjectSummary } from '@/types/projectManagement'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  on_hold:     { label: 'On Hold',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed:   { label: 'Completed',   cls: 'bg-green-50 text-green-700 border-green-200' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-50 text-red-700 border-red-200' },
}

function remainingDaysClass(days?: number | null) {
  if (days == null) return 'text-slate-400'
  if (days < 0)   return 'text-red-600 font-semibold'
  if (days <= 7)  return 'text-orange-600 font-semibold'
  if (days <= 30) return 'text-amber-600 font-semibold'
  return 'text-green-600 font-semibold'
}

function remainingDaysLabel(days?: number | null) {
  if (days == null) return '—'
  if (days < 0) return `${Math.abs(days)}d overdue`
  return `${days}d left`
}

// ── Per-project collapsible node ───────────────────────────────────────────────
interface ProjectNodeProps {
  project: ProjectSummary
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canAssign: boolean
}

function ProjectNode({ project, canRead, canUpdate, canDelete, canAssign }: ProjectNodeProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showProjectBomUpload, setShowProjectBomUpload] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFixtureId, setExportFixtureId] = useState<string>('')
  const canUploadBom = useUIPermission('UPLOAD_BOM')

  const deleteProject = useDeleteProject()
  const exportBomViewExcel = useExportBomViewExcelItemCode()

  // Fixtures for this project (for tree + counts only)
  const { data, isLoading, refetch } = useFixtures(project.id)
  const fixtures = data?.fixtures?.items ?? []
  const total = data?.fixtures?.total ?? 0

  const cfg = STATUS_CONFIG[project.status ?? ''] ?? { label: project.status ?? '—', cls: 'bg-slate-100 text-slate-600 border-slate-200' }

  return (
    <>
      {/* ── Project header row ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Expand toggle */}
          {expanded
            ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}

          {/* Folder icon */}
          {expanded
            ? <FolderOpen className="h-4 w-4 shrink-0 text-indigo-500" />
            : <FolderClosed className="h-4 w-4 shrink-0 text-indigo-400" />}

          {/* Project number + name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {project.projectNumber && (
              <span className="font-mono text-sm font-semibold text-slate-800 shrink-0">
                {project.projectNumber}
              </span>
            )}
            {project.projectNumber && <span className="text-slate-300 shrink-0">—</span>}
            <span className="text-sm font-medium text-slate-900 truncate">{project.name}</span>
          </div>

          {/* Status badge */}
          <Badge variant="secondary" className="text-xs shrink-0">
            Status: {cfg.label}
          </Badge>

          {/* Remaining days */}
          <span className={`text-xs shrink-0 hidden sm:inline ${remainingDaysClass(project.remainingDays)}`}>
            {remainingDaysLabel(project.remainingDays)}
          </span>

          {/* Fixture count badge (only when data loaded) */}
          {data && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {total} fixture{total !== 1 ? 's' : ''}
            </Badge>
          )}

          {/* Action buttons — stop click propagating to expand */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => {
                if (!exportFixtureId && fixtures[0]?.id) setExportFixtureId(fixtures[0].id)
                setShowExportDialog(true)
              }}
            >
              <Download className="h-3 w-3" /> Export Excel
            </Button>
            {canRead && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => navigate(`/projects/${project.id}/view`)}
              >
                <Eye className="h-3 w-3" /> View
              </Button>
            )}
            {canUpdate && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => navigate(`/projects/${project.id}/edit`)}
              >
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
            {canUploadBom && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => {
                  setExpanded(true)
                  setShowProjectBomUpload(true)
                }}
              >
                <Upload className="h-3 w-3" /> Upload BOM
              </Button>
            )}
            {canAssign && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => navigate(`/projects/${project.id}/assignment`)}
              >
                <Users className="h-3 w-3" /> Assign
              </Button>
            )}
            {canDelete && !confirmDelete && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            {canDelete && confirmDelete && (
              <div className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5">
                <span className="text-xs text-red-700 font-medium">Delete?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-red-700 hover:bg-red-100"
                  disabled={deleteProject.isPending}
                  onClick={async () => {
                    await deleteProject.mutateAsync({ id: project.id })
                    setConfirmDelete(false)
                  }}
                >
                  {deleteProject.isPending ? '…' : 'Yes'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-slate-600 hover:bg-slate-100"
                  onClick={() => setConfirmDelete(false)}
                >
                  No
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Expanded fixture tree ── */}
        {expanded && (
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                <Loader /> Loading fixtures…
              </div>
            ) : fixtures.length === 0 ? (
              <div className="py-3 flex items-center gap-3">
                <span className="text-sm text-slate-400 italic">No fixtures yet. Upload a BOM to add fixtures.</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs gap-1 text-slate-400"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <BomTree
                projectId={project.id}
                projectName={project.name}
                fixtures={fixtures}
                showRoot={false}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export BOM View Excel</DialogTitle>
            <DialogDescription>
              Exports the current fixture BOM view into an Excel with two sheets: Manufactured Parts and Standard Parts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Fixture</label>
            <select
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={exportFixtureId}
              onChange={(e) => setExportFixtureId(e.target.value)}
            >
              <option value="" disabled>Select fixture…</option>
              {fixtures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fixtureNumber}
                </option>
              ))}
            </select>
            {fixtures.length === 0 && (
              <p className="text-xs text-slate-500">No fixtures available yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!exportFixtureId || exportBomViewExcel.isPending}
              onClick={async () => {
                try {
                  const res = await exportBomViewExcel.mutateAsync({ fixtureId: exportFixtureId })
                  const url = res.exportBomViewExcel.downloadUrl
                  window.open(url, '_blank', 'noopener,noreferrer')
                  setShowExportDialog(false)
                } catch {
                  // toast handled in hook
                }
              }}
            >
              {exportBomViewExcel.isPending ? 'Exporting…' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showProjectBomUpload && (
        <BomUploadWizard
          projectId={project.id}
          onClose={() => {
            setShowProjectBomUpload(false)
            refetch()
          }}
        />
      )}
    </>
  )
}

// ── Projects directory page ────────────────────────────────────────────────────
export function ProjectsList() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const debouncedSearch = useDebounce(search, 250)

  const { data, isLoading, isError, error, refetch } = useProjects(
    page * PAGE_SIZE,
    PAGE_SIZE,
    status || undefined,
    undefined,
    undefined
  )

  const { canRead, canUpdate } = useEntityActions('project')
  const canAssign = useUIPermission('ASSIGN_PROJECT')

  const list = data?.projects
  const rawItems = list?.items ?? []
  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return rawItems
    return rawItems.filter((p) => {
      const num = (p.projectNumber ?? '').toLowerCase()
      const name = (p.name ?? '').toLowerCase()
      const customer = (p.customerName ?? '').toLowerCase()
      return num.includes(q) || name.includes(q) || customer.includes(q)
    })
  }, [rawItems, debouncedSearch])

  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const { canCreate, canDelete } = useEntityActions('project')
  const [showCreate, setShowCreate] = useState(false)

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Directory view — expand a project to see fixtures, units and parts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" /> New Project
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Search + filter ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            className="flex-1"
            placeholder="Search by code, number, name, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white shrink-0"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0) }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* ── Directory tree ── */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader /></div>
        ) : isError ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-amber-800">{getErrorMessage(error, 'Failed to load projects')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-slate-500">No projects found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((project) => (
              <ProjectNode
                key={project.id}
                project={project}
                canRead={canRead}
                canUpdate={canUpdate}
                canDelete={canDelete}
                canAssign={canAssign}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-500">
              Page {page + 1} of {totalPages} · {total} total
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page <= 0} title="First page">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 0} title="Previous page">
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1} title="Next page">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} title="Last page">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        navigateOnCreate
      />
    </DashboardLayout>
  )
}
