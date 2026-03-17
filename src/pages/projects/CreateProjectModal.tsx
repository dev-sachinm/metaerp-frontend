import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useCreateProject } from '@/hooks/graphql/useProjectAssignments'
import { useCustomers } from '@/hooks/graphql/useMasterDataQueries'
import { getErrorMessage } from '@/lib/graphqlErrors'

function CustomerSelect({ field, inputCls }: { field: { value: string; onChange: (v: string) => void }; inputCls: string }) {
  const { data, isLoading } = useCustomers(0, 500, true)
  const customers = data?.customers?.items ?? []
  return (
    <div>
      <label className="text-sm font-medium leading-none mb-1.5 block">Customer</label>
      <select
        className={inputCls}
        value={field.value ?? ''}
        onChange={(e) => field.onChange(e.target.value)}
        disabled={isLoading}
      >
        <option value="">{isLoading ? 'Loading…' : 'None'}</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code ? `${c.code} — ${c.name}` : c.name}
          </option>
        ))}
      </select>
    </div>
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
  name:          z.string().min(1, 'Project name is required'),
  projectNumber: z.string().optional().nullable(),
  customerId:    z.string().optional().nullable(),
  status:        z.string().optional().nullable(),
  startDate:     z.string().optional().nullable(),
  targetDate:    z.string().optional().nullable(),
  description:   z.string().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

const INPUT_CLS =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

interface Props {
  open: boolean
  onClose: () => void
  /** If true, navigate to edit page after creation */
  navigateOnCreate?: boolean
}

export function CreateProjectModal({ open, onClose, navigateOnCreate = false }: Props) {
  const navigate = useNavigate()
  const create = useCreateProject()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      projectNumber: '',
      customerId: '',
      status: 'open',
      startDate: '',
      targetDate: '',
      description: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    try {
      const result = await create.mutateAsync({
        name:          values.name.trim(),
        projectNumber: values.projectNumber?.trim() || null,
        customerId:    values.customerId?.trim() || null,
        status:        values.status || 'open',
        startDate:     values.startDate || null,
        targetDate:    values.targetDate || null,
        description:   values.description?.trim() || null,
        isActive:      true,
      })
      const created = (result as { createProject: { id: string } }).createProject
      form.reset()
      onClose()
      if (navigateOnCreate && created?.id) {
        navigate(`/projects/${created.id}/edit`)
      }
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to create project'))
    }
  }

  const handleClose = () => {
    form.reset()
    setFormError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="e.g. Robotic Fixture Assembly" autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Project Number */}
            <FormField control={form.control} name="projectNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Project Number</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="e.g. S25049" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <select
                      className={INPUT_CLS}
                      value={field.value ?? 'open'}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Customer */}
              <CustomerSelect field={{ value: form.watch('customerId') ?? '', onChange: (v: string) => form.setValue('customerId', v || null) }} inputCls={INPUT_CLS} />

              {/* Start Date */}
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Target Date */}
              <FormField control={form.control} name="targetDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date</FormLabel>
                  <FormControl>
                    <input type="date" className={INPUT_CLS} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <textarea
                    className={`${INPUT_CLS} min-h-[70px] resize-y`}
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Optional description"
                    rows={2}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
              >
                {create.isPending ? 'Creating…' : 'Create Project'}
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
