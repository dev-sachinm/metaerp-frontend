import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, Building2 } from 'lucide-react'
import { FieldGuard } from '@/components/FieldGuard'
import { getErrorMessage } from '@/lib/graphqlErrors'
import { useCreateCustomer } from '@/hooks/graphql/useMasterDataMutations'

const CUSTOMER_ENTITY = 'customer'

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

export function CreateCustomer() {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()
  const [formError, setFormError] = useState<string | null>(null)

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

  const onSubmit = async (data: CustomerFormData) => {
    setFormError(null)
    try {
      await createCustomer.mutateAsync({
        code: data.code.trim(),
        name: data.name.trim(),
        address: data.address?.trim() || undefined,
        contactInfo: data.contactInfo?.trim() || undefined,
        primaryContactName: data.primaryContactName?.trim() || undefined,
        primaryContactEmail: data.primaryContactEmail?.trim() || undefined,
        primaryContactMobile: data.primaryContactMobile?.trim() || undefined,
        secondaryContactName: data.secondaryContactName?.trim() || undefined,
        secondaryContactEmail: data.secondaryContactEmail?.trim() || undefined,
        secondaryContactMobile: data.secondaryContactMobile?.trim() || undefined,
        isActive: data.isActive ?? true,
      })
      toast.success('Customer created')
      navigate('/master/customers', { replace: true })
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to create customer'))
    }
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
                    Create Customer
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-600">
                    Add a new customer to Master Data.
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
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="code" action="write">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input placeholder="CUST-001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="name" action="write">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Acme Corp" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </FieldGuard>
                    </div>
                    <FieldGuard entity={CUSTOMER_ENTITY} fieldName="address" action="write">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Address (optional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldGuard>
                    <FieldGuard entity={CUSTOMER_ENTITY} fieldName="contactInfo" action="write">
                      <FormField
                        control={form.control}
                        name="contactInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact info</FormLabel>
                            <FormControl>
                              <Input placeholder="Contact person / phone / email (optional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FieldGuard>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="primaryContactName" action="write">
                        <FormField control={form.control} name="primaryContactName" render={({ field }) => (
                          <FormItem><FormLabel>Primary contact name</FormLabel><FormControl><Input placeholder="Name" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="primaryContactEmail" action="write">
                        <FormField control={form.control} name="primaryContactEmail" render={({ field }) => (
                          <FormItem><FormLabel>Primary contact email</FormLabel><FormControl><Input type="email" placeholder="Email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="primaryContactMobile" action="write">
                        <FormField control={form.control} name="primaryContactMobile" render={({ field }) => (
                          <FormItem><FormLabel>Primary contact mobile</FormLabel><FormControl><Input type="tel" placeholder="Mobile" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGuard>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="secondaryContactName" action="write">
                        <FormField control={form.control} name="secondaryContactName" render={({ field }) => (
                          <FormItem><FormLabel>Secondary contact name</FormLabel><FormControl><Input placeholder="Name" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="secondaryContactEmail" action="write">
                        <FormField control={form.control} name="secondaryContactEmail" render={({ field }) => (
                          <FormItem><FormLabel>Secondary contact email</FormLabel><FormControl><Input type="email" placeholder="Email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGuard>
                      <FieldGuard entity={CUSTOMER_ENTITY} fieldName="secondaryContactMobile" action="write">
                        <FormField control={form.control} name="secondaryContactMobile" render={({ field }) => (
                          <FormItem><FormLabel>Secondary contact mobile</FormLabel><FormControl><Input type="tel" placeholder="Mobile" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGuard>
                    </div>
                    <FieldGuard entity={CUSTOMER_ENTITY} fieldName="isActive" action="write">
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
                      disabled={createCustomer.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {createCustomer.isPending ? 'Creating…' : 'Create Customer'}
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

