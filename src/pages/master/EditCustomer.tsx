import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader } from '@/components/Loader'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, Building2 } from 'lucide-react'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { FieldGuard } from '@/components/FieldGuard'
import { useCanEditField } from '@/hooks/usePermissions'
import { useCustomer } from '@/hooks/graphql/useMasterDataQueries'
import { useUpdateCustomer } from '@/hooks/graphql/useMasterDataMutations'

const CUSTOMER_ENTITY = 'customer'

function useCustomerFieldEdit() {
  return {
    code: useCanEditField(CUSTOMER_ENTITY, 'code'),
    name: useCanEditField(CUSTOMER_ENTITY, 'name'),
    address: useCanEditField(CUSTOMER_ENTITY, 'address'),
    contactInfo: useCanEditField(CUSTOMER_ENTITY, 'contactInfo'),
    primaryContactName: useCanEditField(CUSTOMER_ENTITY, 'primaryContactName'),
    primaryContactEmail: useCanEditField(CUSTOMER_ENTITY, 'primaryContactEmail'),
    primaryContactMobile: useCanEditField(CUSTOMER_ENTITY, 'primaryContactMobile'),
    secondaryContactName: useCanEditField(CUSTOMER_ENTITY, 'secondaryContactName'),
    secondaryContactEmail: useCanEditField(CUSTOMER_ENTITY, 'secondaryContactEmail'),
    secondaryContactMobile: useCanEditField(CUSTOMER_ENTITY, 'secondaryContactMobile'),
    isActive: useCanEditField(CUSTOMER_ENTITY, 'isActive'),
  }
}

const customerSchema = z.object({
  code: z.string().min(1, 'Please enter a customer code'),
  name: z.string().min(1, 'Please enter a customer name'),
  address: z.string().optional(),
  contactInfo: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().optional(),
  primaryContactMobile: z.string().optional(),
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z.string().optional(),
  secondaryContactMobile: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

type CustomerFormData = z.infer<typeof customerSchema>

export function EditCustomer() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const customerId = id ?? ''
  const { data, isLoading, isError, error } = useCustomer(customerId || null)
  const updateCustomer = useUpdateCustomer()
  const [formError, setFormError] = useState<string | null>(null)
  const canEdit = useCustomerFieldEdit()

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: 'onBlur',
    defaultValues: {
      code: '',
      name: '',
      address: '',
      contactInfo: '',
      primaryContactName: '',
      primaryContactEmail: '',
      primaryContactMobile: '',
      secondaryContactName: '',
      secondaryContactEmail: '',
      secondaryContactMobile: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (data?.customer) {
      const c = data.customer
      form.reset({
        code: c.code ?? '',
        name: c.name ?? '',
        address: c.address ?? '',
        contactInfo: c.contactInfo ?? '',
        primaryContactName: c.primaryContactName ?? '',
        primaryContactEmail: c.primaryContactEmail ?? '',
        primaryContactMobile: c.primaryContactMobile ?? '',
        secondaryContactName: c.secondaryContactName ?? '',
        secondaryContactEmail: c.secondaryContactEmail ?? '',
        secondaryContactMobile: c.secondaryContactMobile ?? '',
        isActive: c.isActive ?? true,
      })
    }
  }, [data?.customer, form])

  const onSubmit = async (values: CustomerFormData) => {
    if (!customerId) return
    setFormError(null)
    try {
      await updateCustomer.mutateAsync({
        id: customerId,
        input: {
          code: values.code.trim(),
          name: values.name.trim(),
          address: values.address?.trim() || undefined,
          contactInfo: values.contactInfo?.trim() || undefined,
          primaryContactName: values.primaryContactName?.trim() || undefined,
          primaryContactEmail: values.primaryContactEmail?.trim() || undefined,
          primaryContactMobile: values.primaryContactMobile?.trim() || undefined,
          secondaryContactName: values.secondaryContactName?.trim() || undefined,
          secondaryContactEmail: values.secondaryContactEmail?.trim() || undefined,
          secondaryContactMobile: values.secondaryContactMobile?.trim() || undefined,
          isActive: values.isActive ?? true,
        },
      })
      toast.success('Customer updated')
      navigate('/master/customers', { replace: true })
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to update customer'))
    }
  }

  if (!customerId) {
    navigate('/master/customers', { replace: true })
    return null
  }

  if (isLoading && !data?.customer) {
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
          <OperationNotPermitted context="You do not have permission to view or edit this customer." />
        </div>
      </DashboardLayout>
    )
  }
  if (!data?.customer) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Customer not found</CardTitle>
              <CardDescription>
                {isError && error ? getErrorMessage(error, 'The requested customer could not be found.') : 'The requested customer could not be found.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/master/customers')}>
                Back to Customers
              </Button>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/master/customers')}
            className="gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                    Edit Customer
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-600">
                    Update customer details in Master Data.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Alert variant="destructive" className="relative pr-10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <section className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="code" action="read">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="CUST-001"
                                  {...field}
                                  disabled={!canEdit.code}
                                  className={!canEdit.code ? 'bg-muted' : undefined}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="name" action="read">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Acme Corp"
                                  {...field}
                                  disabled={!canEdit.name}
                                  className={!canEdit.name ? 'bg-muted' : undefined}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                    </div>
                    <FieldGuard entity={CUSTOMER_ENTITY} fieldName="address" action="read">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Address (optional)"
                                {...field}
                                disabled={!canEdit.address}
                                className={!canEdit.address ? 'bg-muted' : undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldGuard>
                    <FieldGuard entity={CUSTOMER_ENTITY} fieldName="contactInfo" action="read">
                      <FormField
                        control={form.control}
                        name="contactInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact info</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Contact person / phone / email (optional)"
                                {...field}
                                disabled={!canEdit.contactInfo}
                                className={!canEdit.contactInfo ? 'bg-muted' : undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldGuard>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="primaryContactName" action="read">
                        <FormField
                          control={form.control}
                          name="primaryContactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary contact name</FormLabel>
                              <FormControl>
                                <Input placeholder="Name" {...field} disabled={!canEdit.primaryContactName} className={!canEdit.primaryContactName ? 'bg-muted' : undefined} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="primaryContactEmail" action="read">
                        <FormField
                          control={form.control}
                          name="primaryContactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary contact email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Email" {...field} disabled={!canEdit.primaryContactEmail} className={!canEdit.primaryContactEmail ? 'bg-muted' : undefined} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="primaryContactMobile" action="read">
                        <FormField
                          control={form.control}
                          name="primaryContactMobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary contact mobile</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="Mobile" {...field} disabled={!canEdit.primaryContactMobile} className={!canEdit.primaryContactMobile ? 'bg-muted' : undefined} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="secondaryContactName" action="read">
                        <FormField
                          control={form.control}
                          name="secondaryContactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary contact name</FormLabel>
                              <FormControl>
                                <Input placeholder="Name" {...field} disabled={!canEdit.secondaryContactName} className={!canEdit.secondaryContactName ? 'bg-muted' : undefined} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="secondaryContactEmail" action="read">
                        <FormField
                          control={form.control}
                          name="secondaryContactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary contact email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Email" {...field} disabled={!canEdit.secondaryContactEmail} className={!canEdit.secondaryContactEmail ? 'bg-muted' : undefined} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="secondaryContactMobile" action="read">
                        <FormField
                          control={form.control}
                          name="secondaryContactMobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary contact mobile</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="Mobile" {...field} disabled={!canEdit.secondaryContactMobile} className={!canEdit.secondaryContactMobile ? 'bg-muted' : undefined} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                    </div>
                    <FieldGuard entity={CUSTOMER_ENTITY} fieldName="isActive" action="read">
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                              <FormLabel>Active</FormLabel>
                              <p className="text-xs text-slate-500">
                                Inactive customers are hidden from most selections.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(v) => field.onChange(v)}
                                disabled={!canEdit.isActive}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </FieldGuard>
                  </section>

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/master/customers')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateCustomer.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {updateCustomer.isPending ? 'Saving…' : 'Save Changes'}
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

