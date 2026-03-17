/**
 * Edit User page
 * Requires entity permission: user.update.
 * Uses shadcn Form + React Hook Form + Zod.
 * Username and password cannot be changed via updateUser.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useUser, useUpdateUser } from '@/hooks/graphql/useUsersQuery'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ArrowLeft, UserCircle2, KeyRound, AlertCircle, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Loader } from '@/components/Loader'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'

const editUserSchema = z.object({
  firstName: z.string().min(1, 'Please enter a first name'),
  lastName: z.string().min(1, 'Please enter a last name'),
  dateOfBirth: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Please enter a valid email address'),
  isActive: z.boolean(),
})

type EditUserFormData = z.infer<typeof editUserSchema>

function getEditUserErrorMessage(err: unknown): string {
  if (isPermissionError(err)) return getErrorMessage(err, '')
  const raw = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : ''
  const graphqlMsg =
    err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { errors?: Array<{ message?: string }> } }).response?.errors?.[0]?.message ?? raw
      : raw
  const lower = (graphqlMsg || '').toLowerCase()
  if (lower.includes('email') && lower.includes('already'))
    return 'This email is already registered. Please use another.'
  if (graphqlMsg?.trim()) return graphqlMsg
  return getErrorMessage(err, "We couldn't update the user. Please check the form and try again.")
}

export function EditUser() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const userId = id ?? ''
  const { data, isLoading: isLoadingUser, error } = useUser(userId)
  const updateUser = useUpdateUser()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      mobileNumber: '',
      email: '',
      isActive: true,
    },
  })

  const user = data?.user
  const { reset } = form

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        dateOfBirth: user.dateOfBirth ?? '',
        mobileNumber: user.mobileNumber ?? '',
        email: user.email ?? '',
        isActive: user.isActive ?? true,
      })
    }
  }, [user, reset])

  const onSubmit = async (data: EditUserFormData) => {
    setFormError(null)
    try {
      await updateUser.mutateAsync({
        userId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        dateOfBirth: data.dateOfBirth?.trim() || undefined,
        mobileNumber: data.mobileNumber?.trim() || undefined,
        email: data.email?.trim() || undefined,
        isActive: data.isActive,
      })
      toast.success('User updated successfully')
      navigate('/users', { replace: true })
    } catch (err: unknown) {
      setFormError(getEditUserErrorMessage(err))
    }
  }

  if (!userId) {
    navigate('/users', { replace: true })
    return null
  }

  if (isLoadingUser || !user) {
    return (
      <DashboardLayout>
        <div className="p-8 flex justify-center items-center min-h-[400px]">
          {error ? (
            isPermissionError(error) ? (
              <OperationNotPermitted context="You do not have permission to view or edit this user." />
            ) : (
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>User not found</CardTitle>
                  <CardDescription>
                    {getErrorMessage(error, 'The user could not be loaded. It may have been deleted or you may not have permission.')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/users')} variant="outline">
                    Back to Users
                  </Button>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="w-16 h-16">
              <Loader />
            </div>
          )}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <PermissionGuard entity="user" action="update" fallback={<EditUserNoPermission />}>
      <DashboardLayout>
        <div className="p-8 max-w-2xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/users')}
              className="gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Card className="overflow-hidden border-slate-200/80 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white pb-6">
                <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                  Edit User
                </CardTitle>
                <CardDescription>
                  Editing {user.email || user.username || 'user'} — username cannot be changed
                </CardDescription>
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
                          <button
                            type="button"
                            onClick={() => setFormError(null)}
                            aria-label="Dismiss"
                            className="absolute right-2 top-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/95 text-red-600 shadow-sm ring-1 ring-red-200 hover:bg-white hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </Alert>
                      </motion.div>
                    )}

                    <motion.section
                      className="relative rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                      aria-labelledby="personal-info-heading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.05 }}
                    >
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                          <UserCircle2 className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                          <h2 id="personal-info-heading" className="text-base font-semibold tracking-tight text-slate-800">
                            Personal information
                          </h2>
                          <p className="mt-0.5 text-sm text-slate-500">
                            Name, date of birth, and contact
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First name *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="John"
                                    disabled={updateUser.isPending}
                                    autoComplete="given-name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last name *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Doe"
                                    disabled={updateUser.isPending}
                                    autoComplete="family-name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of birth (optional)</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      disabled={updateUser.isPending}
                                      className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                      )}
                                    >
                                      {field.value ? (
                                        new Date(field.value + 'T00:00:00').toLocaleDateString()
                                      ) : (
                                        'Pick a date'
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    captionLayout="dropdown"
                                    startMonth={new Date(1900, 0)}
                                    endMonth={new Date()}
                                    selected={
                                      field.value
                                        ? new Date(field.value + 'T00:00:00')
                                        : undefined
                                    }
                                    onSelect={(date) => {
                                      if (!date) {
                                        field.onChange('')
                                        return
                                      }
                                      const y = date.getFullYear()
                                      const m = String(date.getMonth() + 1).padStart(2, '0')
                                      const d = String(date.getDate()).padStart(2, '0')
                                      field.onChange(`${y}-${m}-${d}`)
                                    }}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date('1900-01-01')
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mobileNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile number (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="+1 234 567 8900"
                                  disabled={updateUser.isPending}
                                  autoComplete="tel"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.section>

                    <motion.section
                      className="relative rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                      aria-labelledby="account-details-heading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                    >
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                          <KeyRound className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                          <h2 id="account-details-heading" className="text-base font-semibold tracking-tight text-slate-800">
                            Account details
                          </h2>
                          <p className="mt-0.5 text-sm text-slate-500">
                            Email and status — username cannot be changed
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">Username</p>
                          <p className="text-sm text-slate-500 font-mono bg-slate-100 px-3 py-2 rounded-md">
                            {user.username || '—'}
                          </p>
                        </div>
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email address (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="john@example.com"
                                  disabled={updateUser.isPending}
                                  autoComplete="email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-slate-50/50 p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Active</FormLabel>
                                <FormDescription>
                                  Inactive users cannot sign in
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={updateUser.isPending}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.section>

                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
                      <Button
                        type="submit"
                        disabled={updateUser.isPending}
                        className="bg-indigo-600 font-medium text-white shadow-sm hover:bg-indigo-700"
                      >
                        {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/users')}
                        disabled={updateUser.isPending}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  )
}

function EditUserNoPermission() {
  const navigate = useNavigate()
  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You do not have permission to edit users. Contact an administrator if you need access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/users')} variant="outline">
              Back to Users
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
