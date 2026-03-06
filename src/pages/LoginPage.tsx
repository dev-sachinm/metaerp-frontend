/**
 * Login Page
 * Authentication entry point (GraphQL-based).
 * Uses shadcn Form + React Hook Form + Zod.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/graphqlErrors'
import { useLogin } from '@/hooks/graphql/useAuthMutation'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  username: z.string().min(1, 'Please enter your username'),
  password: z.string().min(1, 'Please enter your password'),
})

type LoginFormData = z.infer<typeof loginSchema>

/** Map API/network errors to user-friendly messages for the login form */
function getLoginErrorMessage(err: unknown): string {
  const fromCentral = getErrorMessage(err, '')
  if (fromCentral) return fromCentral
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const lower = raw.toLowerCase()
  if (lower.includes('invalid') && (lower.includes('password') || lower.includes('username')))
    return 'Invalid username or password. Please check your credentials and try again.'
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Unable to connect. Please check your connection and try again.'
  if (lower.includes('timeout'))
    return 'The request took too long. Please try again.'
  if (raw.trim()) return raw
  return 'We couldn’t sign you in. Please try again.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null)
    try {
      await loginMutation.mutateAsync({ username: data.username.trim(), password: data.password })
      navigate('/', { replace: true })
    } catch (err) {
      setFormError(getLoginErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo.png" alt="MetaERP" className="h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Sign In</h1>
          <p className="text-slate-600 mt-2">Manufacturing ERP Platform</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
        >
          <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to continue. All fields are required.</CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter your username"
                          disabled={loginMutation.isPending}
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={loginMutation.isPending}
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {formError && (
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
                )}

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-10"
                >
                  {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-semibold text-foreground mb-2">Demo credentials (username / password)</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Superadmin:</span> superadmin / superadmin123</p>
                <p><span className="font-medium text-foreground">Admin:</span> admin / admin123</p>
                <p><span className="font-medium text-foreground">Manager:</span> manager / manager123</p>
                <p><span className="font-medium text-foreground">Employee:</span> employee / employee123</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          className="mt-8 text-center text-sm text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.2 }}
        >
          <p>Secure Manufacturing ERP Platform</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Badge variant="secondary">GraphQL API</Badge>
            <Badge variant="outline">Role-Based Access</Badge>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
