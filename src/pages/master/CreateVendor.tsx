import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, Store } from 'lucide-react'
import { getErrorMessage } from '@/lib/graphqlErrors'
import { logger } from '@/lib/logger'
import { useCreateVendor, type VendorInput } from '@/hooks/graphql/useMasterDataMutations'
import { getEntityConfig, useEntityFormFields, EntityFormFields, buildFormSchema, buildDefaultValues } from '@/registry'

const ENTITY = 'vendor'
const LIST_PATH = '/master/vendors'

export function CreateVendor() {
  const navigate = useNavigate()
  const create = useCreateVendor()
  const [formError, setFormError] = useState<string | null>(null)
  const formFields = useEntityFormFields(ENTITY, 'create')
  const schema = useMemo(() => buildFormSchema(formFields), [formFields])
  const defaultValues = useMemo(() => buildDefaultValues(formFields), [formFields])
  const config = getEntityConfig(ENTITY)
  const form = useForm({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues })

  const onSubmit = async (data: Record<string, unknown>) => {
    setFormError(null)
    try {
      const input: Record<string, unknown> = {}
      for (const f of formFields) {
        if (f.readOnlyInForm) continue
        const v = data[f.key]
        if (f.type === 'boolean') input[f.key] = Boolean(v)
        else if (v !== undefined && v !== null && v !== '') input[f.key] = typeof v === 'string' ? String(v).trim() : v
      }
      await create.mutateAsync(input as unknown as VendorInput)
      logger.info('Vendor created', { category: 'business', data: { entity: ENTITY, code: input.code } })
      navigate(LIST_PATH, { replace: true })
    } catch (err: unknown) {
      logger.error('Create vendor failed', { category: 'technical', error: err })
      setFormError(getErrorMessage(err, 'Failed to create vendor'))
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(LIST_PATH)} className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to {config?.listTitle ?? 'Vendors'}
          </Button>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><Store className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">{config?.createTitle ?? 'Create Vendor'}</CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-600">Add a new vendor.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {formError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <Alert variant="destructive" className="relative pr-10">
                        <AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                  <EntityFormFields entity={ENTITY} mode="create" control={form.control} />
                  <div className="flex items-center justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate(LIST_PATH)}>Cancel</Button>
                    <Button type="submit" disabled={create.isPending} className="bg-indigo-600 hover:bg-indigo-700">{create.isPending ? 'Creating…' : (config?.createTitle ?? 'Create')}</Button>
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
