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
import { ArrowLeft, AlertCircle, ShoppingCart, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { logger } from '@/lib/logger'
import { usePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderQueries'
import { useUpdatePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderMutations'
import { useVendors, useSuppliers } from '@/hooks/graphql/useMasterDataQueries'
import { useProjects } from '@/hooks/graphql/useProjectAssignments'
import { useEntityActions, useCanEditField, useFieldPermissions } from '@/hooks/usePermissions'
import type { PurchaseOrder } from '@/types/purchaseOrder'

const ENTITY = 'purchase_order'
const LIST_PATH = '/purchase-orders'

const PO_STATUS_OPTIONS = [
  { value: 'Created', label: 'Created' },
  { value: 'CostingUpdated', label: 'Costing Updated' },
  { value: 'Completed', label: 'Completed' },
]

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  details: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  poSendDate: z.string().optional().nullable(),
  poStatus: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

function toDateInput(val?: string | null): string {
  if (!val) return ''
  return val.slice(0, 10)
}

const INPUT_CLS =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

export function EditPurchaseOrder() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const entityId = id ?? ''

  const { data, isLoading, isError, error } = usePurchaseOrder(entityId || undefined)
  const po = data?.purchaseOrder as PurchaseOrder | undefined

  const updateMutation = useUpdatePurchaseOrder(entityId)
  const [formError, setFormError] = useState<string | null>(null)

  const { canUpdate } = useEntityActions(ENTITY)

  const { data: vendorsData } = useVendors(1, 200, { isActive: true })
  const { data: suppliersData } = useSuppliers(1, 200, { isActive: true })
  const { data: projectsData } = useProjects(0, 200)

  const canEditTitle = useCanEditField(ENTITY, 'title')
  const canEditDetails = useCanEditField(ENTITY, 'details')
  const canEditProjectId = useCanEditField(ENTITY, 'projectId')
  const canEditVendorId = useCanEditField(ENTITY, 'vendorId')
  const canEditSupplierId = useCanEditField(ENTITY, 'supplierId')
  const canEditPoSendDate = useCanEditField(ENTITY, 'poSendDate')
  const canEditPoStatus = useCanEditField(ENTITY, 'poStatus')
  const canEditIsActive = useCanEditField(ENTITY, 'isActive')

  const rawFieldPerms = useFieldPermissions(ENTITY)
  const hasFieldPerms = rawFieldPerms !== null && Object.keys(rawFieldPerms).length > 0
  const sf = (canWrite: boolean) => !hasFieldPerms || canWrite

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      details: '',
      projectId: '',
      vendorId: '',
      supplierId: '',
      poSendDate: '',
      poStatus: '',
      isActive: true,
    },
  })
  const { reset } = form

  useEffect(() => {
    if (!po) return
    reset({
      title: po.title ?? '',
      details: po.details ?? '',
      projectId: po.projectId ?? '',
      vendorId: po.vendorId ?? '',
      supplierId: po.supplierId ?? '',
      poSendDate: toDateInput(po.poSendDate),
      poStatus: po.poStatus ?? '',
      isActive: po.isActive ?? true,
    })
  }, [po, reset])

  const onSubmit = async (values: FormValues) => {
    if (!entityId) return
    setFormError(null)
    try {
      const input: Record<string, unknown> = {}
      const allowAll = !hasFieldPerms

      if (allowAll || canEditTitle) {
        input.title = values.title?.trim() || undefined
      }
      if (allowAll || canEditDetails) {
        input.details = values.details?.trim() || null
      }
      if (allowAll || canEditProjectId) {
        input.projectId = values.projectId?.trim() || null
      }
      if (allowAll || canEditVendorId) {
        input.vendorId = values.vendorId?.trim() || null
      }
      if (allowAll || canEditSupplierId) {
        input.supplierId = values.supplierId?.trim() || null
      }
      if (allowAll || canEditPoSendDate) {
        input.poSendDate = values.poSendDate || null
      }
      if (allowAll || canEditPoStatus) {
        input.poStatus = values.poStatus || null
      }
      if (allowAll || canEditIsActive) {
        input.isActive = values.isActive ?? true
      }

      await updateMutation.mutateAsync(input)
      logger.info('Purchase order updated', { category: 'business', data: { entity: ENTITY, id: entityId } })
      navigate(`${LIST_PATH}/${entityId}/view`, { replace: true })
    } catch (err: unknown) {
      logger.error('Update purchase order failed', { category: 'technical', error: err })
      setFormError(getErrorMessage(err, 'Failed to update purchase order'))
    }
  }

  if (!entityId) { navigate(LIST_PATH, { replace: true }); return null }

  if (isLoading && !po) {
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
          <OperationNotPermitted context="You do not have permission to edit this purchase order." />
        </div>
      </DashboardLayout>
    )
  }

  if (!po) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order not found</CardTitle>
              <CardDescription>
                {isError && error ? getErrorMessage(error, 'Not found.') : 'This purchase order does not exist.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(LIST_PATH)}>Back to Purchase Orders</Button>
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
          <OperationNotPermitted context="You do not have permission to update purchase orders." />
        </div>
      </DashboardLayout>
    )
  }

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
            <ArrowLeft className="h-4 w-4" /> Back to PO
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
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                    Edit Purchase Order
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-500">
                    {po.poNumber} · {po.title}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                  {formError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {sf(canEditTitle) && (
                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="Purchase order title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    <div className="sm:col-span-2">
                      <p className="text-sm font-medium text-slate-700 mb-1">PO Type</p>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-md px-3 py-2 border border-slate-200">
                        {po.poType}
                      </p>
                    </div>

                    {sf(canEditPoStatus) && (
                      <FormField control={form.control} name="poStatus" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <select
                              className={INPUT_CLS}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            >
                              <option value="">Select status</option>
                              {PO_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
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
                            <p className="text-xs text-slate-500 mt-0.5">Whether this PO is currently active</p>
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

                    {sf(canEditProjectId) && (
                      <FormField control={form.control} name="projectId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <FormControl>
                            <select
                              className={INPUT_CLS}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            >
                              <option value="">None</option>
                              {projectsData?.projects.items.map((p) => (
                                <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditVendorId) && (
                      <FormField control={form.control} name="vendorId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <FormControl>
                            <select
                              className={INPUT_CLS}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            >
                              <option value="">None</option>
                              {vendorsData?.vendors.items.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditSupplierId) && (
                      <FormField control={form.control} name="supplierId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <FormControl>
                            <select
                              className={INPUT_CLS}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            >
                              <option value="">None</option>
                              {suppliersData?.suppliers.items.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditPoSendDate) && (
                      <FormField control={form.control} name="poSendDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>PO Send Date</FormLabel>
                          <FormControl>
                            <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {sf(canEditDetails) && (
                      <FormField control={form.control} name="details" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Details / Notes</FormLabel>
                          <FormControl>
                            <textarea
                              className={`${INPUT_CLS} min-h-[80px] resize-y`}
                              {...field}
                              value={field.value ?? ''}
                              placeholder="Additional instructions..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>

                  {(po.createdAt || po.modifiedAt) && (
                    <section className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Audit</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                        {po.createdAt && (
                          <span>Created by <strong>{po.createdByUsername ?? '—'}</strong> on {new Date(po.createdAt).toLocaleString()}</span>
                        )}
                        {po.modifiedAt && (
                          <span>Last modified on {new Date(po.modifiedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </section>
                  )}

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
                      disabled={updateMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
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
