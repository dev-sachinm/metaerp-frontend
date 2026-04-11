import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader } from '@/components/Loader'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, FolderTree } from 'lucide-react'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { logger } from '@/lib/logger'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { FieldGuard } from '@/components/FieldGuard'
import { useProductCategories, useProductCategory } from '@/hooks/graphql/useMasterDataQueries'
import { useUpdateProductCategory, type ProductCategoryInput } from '@/hooks/graphql/useMasterDataMutations'
import type { ProductCategory } from '@/types/masterData'
import {
  getEntityConfig,
  useEntityFormFields,
  EntityFormFields,
  buildFormSchema,
  buildDefaultValues,
} from '@/registry'

const ENTITY = 'product_category'
const LIST_PATH = '/master/product-categories'
const DATA_KEY = 'productCategory' as const

export function EditProductCategory() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const entityId = id ?? ''
  const { data, isLoading, isError, error } = useProductCategory(entityId || null)
  const recordData = data as { productCategory: ProductCategory | null } | undefined
  const update = useUpdateProductCategory()
  const [formError, setFormError] = useState<string | null>(null)
  const formFields = useEntityFormFields(ENTITY, 'edit')
  const schema = useMemo(() => buildFormSchema(formFields), [formFields])
  const defaultValues = useMemo(() => buildDefaultValues(formFields), [formFields])
  const config = getEntityConfig(ENTITY)
  const { data: categoriesData, isLoading: categoriesLoading } = useProductCategories(0, 100)
  const parentOptions = (categoriesData?.productCategories?.items ?? []).filter((cat) => cat.id !== entityId)

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues,
  })
  const { reset } = form

  useEffect(() => {
    const record = recordData?.[DATA_KEY]
    if (!record) return
    const r = record as unknown as Record<string, unknown>
    const values: Record<string, string | boolean> = {}
    for (const f of formFields) {
      const raw = r[f.key]
      values[f.key] = (raw ?? (f.type === 'boolean' ? false : '')) as string | boolean
    }
    reset(values)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formFields omitted to avoid infinite loop (new ref each render)
  }, [recordData?.[DATA_KEY], reset])

  const onSubmit = async (values: Record<string, unknown>) => {
    if (!entityId) return
    setFormError(null)
    try {
      const input: Record<string, unknown> = {}
      for (const f of formFields) {
        if (f.readOnlyInForm) continue
        const v = values[f.key]
        if (f.type === 'boolean') {
          input[f.key] = Boolean(v)
        } else if (v !== undefined && v !== null && v !== '') {
          input[f.key] = typeof v === 'string' ? String(v).trim() : v
        }
      }
      await update.mutateAsync({ id: entityId, input: input as unknown as ProductCategoryInput })
      logger.info('Product category updated', { category: 'business', data: { entity: ENTITY, id: entityId } })
      navigate(LIST_PATH, { replace: true })
    } catch (err: unknown) {
      logger.error('Update product category failed', { category: 'technical', error: err })
      setFormError(getErrorMessage(err, 'Failed to update product category'))
    }
  }

  if (!entityId) {
    navigate(LIST_PATH, { replace: true })
    return null
  }
  if (isLoading && !recordData?.[DATA_KEY]) {
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
        <div className="p-8 max-w-2xl mx-auto">
          <OperationNotPermitted context="You do not have permission to view or edit this product category." />
        </div>
      </DashboardLayout>
    )
  }
  if (!recordData?.[DATA_KEY]) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{config?.listTitle ?? 'Product Category'} not found</CardTitle>
              <CardDescription>{isError && error ? getErrorMessage(error, 'Not found.') : 'Not found.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(LIST_PATH)}>Back to {config?.listTitle}</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(LIST_PATH)} className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to {config?.listTitle ?? 'Product Categories'}
          </Button>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">{config?.editTitle ?? 'Edit Product Category'}</CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-600">Update product category details.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {formError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <Alert variant="destructive" className="relative pr-10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                  <FieldGuard entity={ENTITY} fieldName="parentId" action="read">
                    <FormField
                      control={form.control}
                      name={'parentId'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent</FormLabel>
                          <FormControl>
                            <select
                              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                              value={typeof field.value === 'string' ? field.value : ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              disabled={categoriesLoading}
                            >
                              <option value="">{categoriesLoading ? 'Loading…' : 'None'}</option>
                              {parentOptions.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.categoryName}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <EntityFormFields entity={ENTITY} mode="edit" control={form.control} />
                  {recordData[DATA_KEY] && ((recordData[DATA_KEY] as ProductCategory).createdAt != null || (recordData[DATA_KEY] as ProductCategory).modifiedAt != null) && (
                    <section className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Metadata</p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {(recordData[DATA_KEY] as ProductCategory).createdAt != null && (
                          <span>Created: {new Date((recordData[DATA_KEY] as ProductCategory).createdAt!).toLocaleString()}</span>
                        )}
                        {(recordData[DATA_KEY] as ProductCategory).modifiedAt != null && (
                          <span>Modified: {new Date((recordData[DATA_KEY] as ProductCategory).modifiedAt!).toLocaleString()}</span>
                        )}
                      </div>
                    </section>
                  )}
                  <div className="flex items-center justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate(LIST_PATH)}>Cancel</Button>
                    <Button type="submit" disabled={update.isPending} className="bg-indigo-600 hover:bg-indigo-700">
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
