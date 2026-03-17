import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  FolderKanban,
  Building2,
  CalendarDays,
  Clock,
  Wallet,
  Users,
  CheckCircle2,
  AlertCircle,
  Timer,
  Wrench,
  Ruler,
  ShoppingCart,
  FlaskConical,
  Layers,
  Pencil,
} from 'lucide-react'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { useProject } from '@/hooks/graphql/useProjectAssignments'
import { useEntityActions, useCanReadField } from '@/hooks/usePermissions'
import type { Project } from '@/types/projectManagement'

const LIST_PATH = '/projects'

function formatDate(val?: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(val?: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(val?: number | null) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open:        { label: 'Open',        className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  on_hold:     { label: 'On Hold',     className: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed:   { label: 'Completed',   className: 'bg-green-50 text-green-700 border-green-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-50 text-red-700 border-red-200' },
}

function StatusBadge({ status }: { status?: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ''] ?? { label: status ?? '—', className: 'bg-slate-50 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function RemainingDaysBadge({ days }: { days?: number | null }) {
  if (days == null) return <span className="text-slate-400 text-sm">—</span>
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
      <AlertCircle className="h-4 w-4" /> {Math.abs(days)} days overdue
    </span>
  )
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
      <Timer className="h-4 w-4" /> {days} days left
    </span>
  )
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
      <Clock className="h-4 w-4" /> {days} days left
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
      <CheckCircle2 className="h-4 w-4" /> {days} days left
    </span>
  )
}

interface SectionProps { title: string; icon: React.ReactNode; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-indigo-500">{icon}</div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 divide-y divide-slate-100">
        {children}
      </div>
    </div>
  )
}

interface FieldProps { label: string; value: React.ReactNode; className?: string }
function Field({ label, value, className }: FieldProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 px-4 py-2.5 ${className ?? ''}`}>
      <dt className="w-52 shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-900 font-medium">{value ?? <span className="text-slate-300 font-normal">—</span>}</dd>
    </div>
  )
}

interface MilestoneRowProps { icon: React.ReactNode; label: string; date?: string | null }
function MilestoneRow({ icon, label, date }: MilestoneRowProps) {
  const hasDate = !!date
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${hasDate ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-300'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-semibold ${hasDate ? 'text-slate-900' : 'text-slate-300'}`}>{formatDate(date)}</p>
      </div>
    </div>
  )
}

export function ViewProject() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const entityId = id ?? ''

  const { data, isLoading, isError, error } = useProject(entityId || null)
  const project = (data as { project: Project | null } | undefined)?.project
  const { canUpdate } = useEntityActions('project')

  const ENTITY = 'project'
  const rf = {
    name:                    useCanReadField(ENTITY, 'name'),
    projectNumber:           useCanReadField(ENTITY, 'projectNumber'),
    description:             useCanReadField(ENTITY, 'description'),
    status:                  useCanReadField(ENTITY, 'status'),
    isActive:                useCanReadField(ENTITY, 'isActive'),
    customerId:              useCanReadField(ENTITY, 'customerId'),
    customerName:            useCanReadField(ENTITY, 'customerName'),
    startDate:               useCanReadField(ENTITY, 'startDate'),
    targetDate:              useCanReadField(ENTITY, 'targetDate'),
    actualDeliveryDate:      useCanReadField(ENTITY, 'actualDeliveryDate'),
    remainingDays:           useCanReadField(ENTITY, 'remainingDays'),
    budget:                  useCanReadField(ENTITY, 'budget'),
    purchaseBudget:          useCanReadField(ENTITY, 'purchaseBudget'),
    designerTargetDate:      useCanReadField(ENTITY, 'designerTargetDate'),
    procurementTargetDate:   useCanReadField(ENTITY, 'procurementTargetDate'),
    manufacturingTargetDate: useCanReadField(ENTITY, 'manufacturingTargetDate'),
    qualityTargetDate:       useCanReadField(ENTITY, 'qualityTargetDate'),
    assemblyTargetDate:      useCanReadField(ENTITY, 'assemblyTargetDate'),
    createdAt:               useCanReadField(ENTITY, 'createdAt'),
    createdBy:               useCanReadField(ENTITY, 'createdBy'),
    modifiedAt:              useCanReadField(ENTITY, 'modifiedAt'),
    modifiedBy:              useCanReadField(ENTITY, 'modifiedBy'),
  }

  if (!entityId) { navigate(LIST_PATH, { replace: true }); return null }

  if (isLoading && !project) {
    return (
      <DashboardLayout>
        <div className="p-8 flex justify-center items-center min-h-[400px]">
          <Loader />
        </div>
      </DashboardLayout>
    )
  }

  if (isError && error && isPermissionError(error)) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <OperationNotPermitted context="You do not have permission to view this project." />
        </div>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Project not found</CardTitle>
              <CardDescription>
                {isError && error ? getErrorMessage(error, 'Not found.') : 'This project does not exist.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(LIST_PATH)}>
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">

        {/* Back button row */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(LIST_PATH)}
            className="gap-2 text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Button>
          {canUpdate && (
            <Button
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate(`${LIST_PATH}/${entityId}/edit`)}
            >
              <Pencil className="h-4 w-4" /> Edit Project
            </Button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-5"
        >
          {/* ── Hero header ── */}
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
                    <FolderKanban className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white leading-tight">{rf.name ? project.name : '—'}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-indigo-200 text-sm">
                      {rf.projectNumber && project.projectNumber && <span>#{project.projectNumber}</span>}
                    </div>
                    {rf.description && project.description && (
                      <p className="mt-2 text-sm text-indigo-100 max-w-xl">{project.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {rf.status && <StatusBadge status={project.status} />}
                  {rf.isActive && (
                    <Badge variant={project.isActive ? 'default' : 'secondary'} className={project.isActive ? 'bg-white/20 text-white border-white/30 hover:bg-white/20' : ''}>
                      {project.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-t border-slate-100">
              {(rf.customerId || rf.customerName) && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Customer</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{project.customerName ?? project.customerId ?? '—'}</p>
                </div>
              )}
              {rf.startDate && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Start Date</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(project.startDate)}</p>
                </div>
              )}
              {rf.targetDate && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Target Date</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(project.targetDate)}</p>
                </div>
              )}
              {rf.remainingDays && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Remaining</p>
                  <RemainingDaysBadge days={project.remainingDays} />
                </div>
              )}
            </div>
          </Card>

          {/* ── Overview content (single tab) ── */}
          <div className="space-y-5">

          {/* ── Two-column layout ── */}
          <div className="grid md:grid-cols-2 gap-5">

            {/* Overview */}
            {(rf.status || rf.isActive || rf.customerId || rf.customerName) && (
              <Section title="Overview" icon={<FolderKanban className="h-4 w-4" />}>
                {(rf.customerId || rf.customerName) && (
                  <Field label="Customer" value={project.customerName ?? project.customerId ?? '—'} />
                )}
                {rf.status && <Field label="Status" value={<StatusBadge status={project.status} />} />}
                {rf.isActive && <Field label="Active" value={project.isActive ? 'Yes' : 'No'} />}
              </Section>
            )}

            {/* Timeline */}
            {(rf.startDate || rf.targetDate || rf.actualDeliveryDate || rf.remainingDays) && (
              <Section title="Timeline" icon={<CalendarDays className="h-4 w-4" />}>
                {rf.startDate && <Field label="Start Date" value={formatDate(project.startDate)} />}
                {rf.targetDate && <Field label="Target Date" value={formatDate(project.targetDate)} />}
                {rf.actualDeliveryDate && <Field label="Actual Delivery" value={project.actualDeliveryDate ? formatDate(project.actualDeliveryDate) : undefined} />}
                {rf.remainingDays && <Field label="Remaining" value={<RemainingDaysBadge days={project.remainingDays} />} />}
              </Section>
            )}

            {/* Budget */}
            {(rf.budget || rf.purchaseBudget) && (
              <Section title="Budget" icon={<Wallet className="h-4 w-4" />}>
                {rf.budget && <Field label="Total Budget" value={formatCurrency(project.budget)} />}
                {rf.purchaseBudget && <Field label="Purchase Budget" value={formatCurrency(project.purchaseBudget)} />}
              </Section>
            )}

          </div>

          {/* ── Department Milestones ── */}
          {(rf.designerTargetDate || rf.procurementTargetDate || rf.manufacturingTargetDate || rf.qualityTargetDate || rf.assemblyTargetDate) && (
            <Section title="Department Target Dates" icon={<Users className="h-4 w-4" />}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {rf.designerTargetDate && <MilestoneRow icon={<Ruler className="h-3.5 w-3.5" />} label="Designer" date={project.designerTargetDate} />}
                {rf.procurementTargetDate && <MilestoneRow icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Procurement" date={project.procurementTargetDate} />}
                {rf.manufacturingTargetDate && <MilestoneRow icon={<Wrench className="h-3.5 w-3.5" />} label="Manufacturing" date={project.manufacturingTargetDate} />}
                {rf.qualityTargetDate && <MilestoneRow icon={<FlaskConical className="h-3.5 w-3.5" />} label="Quality" date={project.qualityTargetDate} />}
                {rf.assemblyTargetDate && <MilestoneRow icon={<Layers className="h-3.5 w-3.5" />} label="Assembly" date={project.assemblyTargetDate} />}
              </div>
            </Section>
          )}

          {/* ── Audit ── */}
          {(rf.createdBy || rf.createdAt || rf.modifiedBy || rf.modifiedAt) && (
            <Section title="Audit" icon={<Building2 className="h-4 w-4" />}>
              <div className="grid sm:grid-cols-2">
                {rf.createdBy && <Field label="Created By" value={project.createdByUsername ?? project.createdBy} />}
                {rf.createdAt && <Field label="Created At" value={formatDateTime(project.createdAt)} />}
                {rf.modifiedBy && <Field label="Modified By" value={project.modifiedByUsername ?? project.modifiedBy} />}
                {rf.modifiedAt && <Field label="Modified At" value={formatDateTime(project.modifiedAt)} />}
              </div>
            </Section>
          )}

          </div>

        </motion.div>
      </div>
    </DashboardLayout>
  )
}
