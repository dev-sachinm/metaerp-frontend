/**
 * Change User Password - Set another user's password (admin).
 * Requires entity permission: user.update.
 * Uses setUserPassword(userId, newPassword). New password min 6 characters.
 */

import { useState } from 'react'
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PermissionGuard } from '@/components/PermissionGuard'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { useUser, useSetUserPassword } from '@/hooks/graphql/useUsersQuery'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ArrowLeft, KeyRound, AlertCircle } from 'lucide-react'
import { Loader } from '@/components/Loader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const MIN_PASSWORD_LENGTH = 6

const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

export function ChangeUserPassword() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const userId = id ?? ''
  const { data, isLoading: isLoadingUser, error } = useUser(userId)
  const setUserPassword = useSetUserPassword()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  const user = data?.user

  const onSubmit = async (data: ChangePasswordFormData) => {
    setFormError(null)
    try {
      await setUserPassword.mutateAsync({
        userId,
        newPassword: data.newPassword,
      })
      toast.success('Password updated successfully')
      navigate('/users', { replace: true })
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to update password. Please try again.'))
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
              <OperationNotPermitted context="You do not have permission to view this user or change their password." />
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

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.username || 'User'

  return (
    <PermissionGuard entity="user" action="update" fallback={<ChangeUserPasswordNoPermission />}>
      <DashboardLayout>
        <div className="p-8 max-w-md mx-auto">
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
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                      Change password
                    </CardTitle>
                    <CardDescription>
                      Set a new password for {displayName}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {formError && (
                      <Alert variant="destructive" className="relative pr-10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                        <button
                          type="button"
                          onClick={() => setFormError(null)}
                          aria-label="Dismiss"
                          className="absolute right-2 top-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/95 text-red-600 shadow-sm ring-1 ring-red-200 hover:bg-white hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </Alert>
                    )}

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="At least 6 characters"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Re-enter password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/users')}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={setUserPassword.isPending}
                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                      >
                        {setUserPassword.isPending ? 'Updating…' : 'Update password'}
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

function ChangeUserPasswordNoPermission() {
  const navigate = useNavigate()
  return (
    <DashboardLayout>
      <div className="p-8 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You need update permission on users to change another user&apos;s password.
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
