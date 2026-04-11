import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  AlertCircle,
  FolderKanban,
  Eye,
  CalendarDays,
  Wallet,
  Users,
  Ruler,
  ShoppingCart,
  Wrench,
  FlaskConical,
  Layers,
} from 'lucide-react'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { logger } from '@/lib/logger'
import { useProject, useUpdateProject, type ProjectUpdateInput } from '@/hooks/graphql/useProjectAssignments'
import { useCustomers } from '@/hooks/graphql/useMasterDataQueries'
import { useEntityActions, useCanEditField, useFieldPermissions } from '@/hooks/usePermissions'
import type { Project } from '@/types/projectManagement'

const ENTITY = 'project'
const LIST_PATH = '/projects'

function CustomerDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data, isLoading } = useCustomers(1, 500, { isActive: true })
  const customers = data?.customers?.items ?? []
  return (
    <select
      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || '')}
      disabled={isLoading}
    >
      <option value="">{isLoading ? 'Loading…' : 'None'}</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code ? `${c.code} — ${c.name}` : c.name}
        </option>
      ))}
    </select>
  )
}

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold',     label: 'On Hold' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

const schema = z.object({
  name:                       z.string().min(1, 'Name is required'),
  description:                z.string().optional().nullable(),
  status:                     z.string().optional().nullable(),
  customerId:                 z.string().optional().nullable(),
  startDate:                  z.string().optional().nullable(),
  targetDate:                 z.string().optional().nullable(),
  actualDeliveryDate:         z.string().optional().nullable(),
  budget:                     z.coerce.number().optional().nullable(),
  purchaseBudget:             z.coerce.number().optional().nullable(),
  designerTargetDate:         z.string().optional().nullable(),
  procurementTargetDate:      z.string().optional().nullable(),
  manufacturingTargetDate:    z.string().optional().nullable(),
  qualityTargetDate:          z.string().optional().nullable(),
  assemblyTargetDate:         z.string().optional().nullable(),
  isActive:                   z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

// ── helpers ────────────────────────────────────────────────────────────────
/** Convert ISO / datetime string → HTML date input value (YYYY-MM-DD) */
function toDateInput(val?: string | null): string {
  if (!val) return ''
  return val.slice(0, 10)
}

const INPUT_CLS =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

interface SectionProps { title: string; icon: React.ReactNode; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="text-indigo-500">{icon}</div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

// ── component ──────────────────────────────────────────────────────────────
export function EditProject() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const entityId = id ?? ''

  const { data, isLoading, isError, error } = useProject(entityId || null)
  const project = (data as { project: Project | null } | undefined)?.project

  const update = useUpdateProject()
  const [formError, setFormError] = useState<string | null>(null)

  const { canUpdate } = useEntityActions(ENTITY)

  // Field-level write permissions
  const canEditName                    = useCanEditField(ENTITY, 'name')
  const canEditDescription             = useCanEditField(ENTITY, 'description')
  const canEditStatus                  = useCanEditField(ENTITY, 'status')
  const canEditCustomerId              = useCanEditField(ENTITY, 'customerId')
  const canEditIsActive                = useCanEditField(ENTITY, 'isActive')
  const canEditStartDate               = useCanEditField(ENTITY, 'startDate')
  const canEditTargetDate              = useCanEditField(ENTITY, 'targetDate')
  const canEditActualDelivery          = useCanEditField(ENTITY, 'actualDeliveryDate')
  const canEditBudget                  = useCanEditField(ENTITY, 'budget')
  const canEditPurchaseBudget          = useCanEditField(ENTITY, 'purchaseBudget')
  const canEditDesignerDate            = useCanEditField(ENTITY, 'designerTargetDate')
  const canEditProcurementDate         = useCanEditField(ENTITY, 'procurementTargetDate')
  const canEditManufacturingDate       = useCanEditField(ENTITY, 'manufacturingTargetDate')
  const canEditQualityDate             = useCanEditField(ENTITY, 'qualityTargetDate')
  const canEditAssemblyDate            = useCanEditField(ENTITY, 'assemblyTargetDate')

  // When no field-level permissions are configured for this entity, show ALL fields (entity-level fallback).
  // When field permissions ARE configured, show ONLY fields the user can write.
  const rawFieldPerms = useFieldPermissions(ENTITY)
  const hasFieldPerms = rawFieldPerms !== null && Object.keys(rawFieldPerms).length > 0
  // sf(canWriteSpecific) → whether to render the field at all
  const sf = (canWrite: boolean) => !hasFieldPerms || canWrite

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '', description: '', status: '', customerId: '',
      startDate: '', targetDate: '', actualDeliveryDate: '',
      budget: undefined, purchaseBudget: undefined,
      designerTargetDate: '', procurementTargetDate: '',
      manufacturingTargetDate: '', qualityTargetDate: '', assemblyTargetDate: '',
      isActive: true,
    },
  })
  const { reset } = form

  useEffect(() => {
    if (!project) return
    reset({
      name:                    project.name ?? '',
      description:             project.description ?? '',
      status:                  project.status ?? '',
      customerId:              project.customerId ?? '',
      startDate:               toDateInput(project.startDate),
      targetDate:              toDateInput(project.targetDate),
      actualDeliveryDate:      toDateInput(project.actualDeliveryDate),
      budget:                  project.budget ?? undefined,
      purchaseBudget:          project.purchaseBudget ?? undefined,
      designerTargetDate:      toDateInput(project.designerTargetDate),
      procurementTargetDate:   toDateInput(project.procurementTargetDate),
      manufacturingTargetDate: toDateInput(project.manufacturingTargetDate),
      qualityTargetDate:       toDateInput(project.qualityTargetDate),
      assemblyTargetDate:      toDateInput(project.assemblyTargetDate),
      isActive:                project.isActive ?? true,
    })
  }, [project, reset])

  const onSubmit = async (values: FormValues) => {
    if (!entityId) return
    setFormError(null)
    try {
      // Only send fields the user is actually allowed to edit.
      // If there are no field-level perms configured, fall back to sending everything.
      const input: ProjectUpdateInput = {}
      const allowAll = !hasFieldPerms

      if (allowAll || canEditName) {
        input.name = values.name?.trim() || undefined
      }
      if (allowAll || canEditDescription) {
        input.description = values.description?.trim() || null
      }
      if (allowAll || canEditStatus) {
        input.status = values.status || null
      }
      if (allowAll || canEditCustomerId) {
        input.customerId = values.customerId?.trim() || null
      }
      if (allowAll || canEditStartDate) {
        input.startDate = values.startDate || null
      }
      if (allowAll || canEditTargetDate) {
        input.targetDate = values.targetDate || null
      }
      if (allowAll || canEditActualDelivery) {
        input.actualDeliveryDate = values.actualDeliveryDate || null
      }
      if (allowAll || canEditBudget) {
        input.budget = values.budget ?? null
      }
      if (allowAll || canEditPurchaseBudget) {
        input.purchaseBudget = values.purchaseBudget ?? null
      }
      if (allowAll || canEditDesignerDate) {
        input.designerTargetDate = values.designerTargetDate || null
      }
      if (allowAll || canEditProcurementDate) {
        input.procurementTargetDate = values.procurementTargetDate || null
      }
      if (allowAll || canEditManufacturingDate) {
        input.manufacturingTargetDate = values.manufacturingTargetDate || null
      }
      if (allowAll || canEditQualityDate) {
        input.qualityTargetDate = values.qualityTargetDate || null
      }
      if (allowAll || canEditAssemblyDate) {
        input.assemblyTargetDate = values.assemblyTargetDate || null
      }
      if (allowAll || canEditIsActive) {
        input.isActive = values.isActive ?? true
      }

      await update.mutateAsync({ id: entityId, input })
      logger.info('Project updated', { category: 'business', data: { entity: ENTITY, id: entityId } })
      navigate(`${LIST_PATH}/${entityId}/view`, { replace: true })
    } catch (err: unknown) {
      logger.error('Update project failed', { category: 'technical', error: err })
      setFormError(getErrorMessage(err, 'Failed to update project'))
    }
  }

  // ── guards ──────────────────────────────────────────────────────────────
  if (!entityId) { navigate(LIST_PATH, { replace: true }); return null }

  if (isLoading && !project) {
    return (
      <DashboardLayout>
        <div className="p-8 flex justify-center items-center min-h-[400px]"><Loader /></div>
      </DashboardLayout>
    )
  }

  if (isError && error && isPermissionError(error)) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <OperationNotPermitted context="You do not have permission to edit this project." />
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
              <Button variant="outline" onClick={() => navigate(LIST_PATH)}>Back to Projects</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!canUpdate) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <OperationNotPermitted context="You do not have permission to update projects." />
        </div>
      </DashboardLayout>
    )
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`${LIST_PATH}/${entityId}/view`)}
            className="gap-2 text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Project
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to={`${LIST_PATH}/${entityId}/view`}>
              <Eye className="h-4 w-4" /> View
            </Link>
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            {/* Header */}
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                    Edit Project
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-500">
                    {project.projectNumber ?? project.id} · {project.name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                  {/* Error banner */}
                  {formError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {/* ── Basic Info ── */}
                  <Section title="Basic Info" icon={<FolderKanban className="h-4 w-4" />}>

                    {sf(canEditName) && (
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Project Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="Enter project name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditStatus) && (
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <select
                              className={INPUT_CLS}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            >
                              <option value="">Select status</option>
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditCustomerId) && (
                      <FormField control={form.control} name="customerId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <FormControl>
                            <CustomerDropdown value={field.value ?? ''} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditIsActive) && (
                      <FormField control={form.control} name="isActive" render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
                          <div className="flex-1">
                            <FormLabel className="text-sm font-medium text-slate-700">Active</FormLabel>
                            <p className="text-xs text-slate-500 mt-0.5">Whether this project is currently active</p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </FormControl>
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditDescription) && (
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <textarea
                              className={`${INPUT_CLS} min-h-[80px] resize-y`}
                              {...field}
                              value={field.value ?? ''}
                              placeholder="Project description (optional)"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                  </Section>

                  <div className="border-t border-slate-100" />

                  {/* ── Timeline ── */}
                  <Section title="Timeline" icon={<CalendarDays className="h-4 w-4" />}>

                    {sf(canEditStartDate) && (
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditTargetDate) && (
                      <FormField control={form.control} name="targetDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Date</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditActualDelivery) && (
                      <FormField control={form.control} name="actualDeliveryDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Delivery Date</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                  </Section>

                  <div className="border-t border-slate-100" />

                  {/* ── Budget ── */}
                  <Section title="Budget" icon={<Wallet className="h-4 w-4" />}>

                    {sf(canEditBudget) && (
                      <FormField control={form.control} name="budget" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Budget</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditPurchaseBudget) && (
                      <FormField control={form.control} name="purchaseBudget" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Budget</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                  </Section>

                  <div className="border-t border-slate-100" />

                  {/* ── Department Target Dates ── */}
                  <Section title="Department Target Dates" icon={<Users className="h-4 w-4" />}>

                    {sf(canEditDesignerDate) && (
                      <FormField control={form.control} name="designerTargetDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-slate-400" /> Designer</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditProcurementDate) && (
                      <FormField control={form.control} name="procurementTargetDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5 text-slate-400" /> Procurement</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditManufacturingDate) && (
                      <FormField control={form.control} name="manufacturingTargetDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-slate-400" /> Manufacturing</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditQualityDate) && (
                      <FormField control={form.control} name="qualityTargetDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5 text-slate-400" /> Quality</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditAssemblyDate) && (
                      <FormField control={form.control} name="assemblyTargetDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-slate-400" /> Assembly</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                  </Section>

                  {/* ── Audit metadata ── */}
                  {(project.createdAt || project.modifiedAt) && (
                    <section className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Audit</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                        {project.createdAt && (
                          <span>Created by <strong>{project.createdByUsername ?? project.createdBy ?? '—'}</strong> on {new Date(project.createdAt).toLocaleString()}</span>
                        )}
                        {project.modifiedAt && (
                          <span>Last modified by <strong>{project.modifiedByUsername ?? project.modifiedBy ?? '—'}</strong> on {new Date(project.modifiedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </section>
                  )}

                  {/* ── Actions ── */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`${LIST_PATH}/${entityId}/view`)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={update.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                    >
                      {update.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </div>

                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
