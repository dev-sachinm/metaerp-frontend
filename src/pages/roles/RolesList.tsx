/**
 * Roles and Permissions - Dedicated page for authorised users to:
 * - Add and delete roles
 * - Update model-level (entity) permissions
 * - Update field-level permissions (via Edit permissions → single-role editor)
 * Requires role.read to view; role.update to add/edit; role.delete to delete.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Loader } from '@/components/Loader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRoles, useUpsertRoleWithPermissions, useDeleteRole, type Role } from '@/hooks/graphql/useRolesQuery'
import { useEntityActions } from '@/hooks/usePermissions'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Shield, ArrowRight, RefreshCw, Plus, Trash2, Lock } from 'lucide-react'

const ROLE_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-indigo-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
]

function roleGradient(index: number) {
  return ROLE_GRADIENTS[index % ROLE_GRADIENTS.length]
}

export function RolesList() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useRoles()
  const { canUpdate, canDelete } = useEntityActions('role')
  const upsertRole = useUpsertRoleWithPermissions()
  const deleteRole = useDeleteRole()

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  const roles = data?.getRoles ?? []

  const handleManagePermissions = (role: Role) => {
    if (!canUpdate) return
    navigate(`/roles/${role.id}/permissions`)
  }

  const handleAddRole = () => {
    const name = newName.trim()
    if (!name) {
      toast.error('Role name is required')
      return
    }
    upsertRole.mutate(
      { name, description: newDescription.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Role "${name}" created`)
          setAddOpen(false)
          setNewName('')
          setNewDescription('')
        },
        onError: (err) => {
          if (!isPermissionError(err)) toast.error(getErrorMessage(err, 'Failed to create role'))
        },
      }
    )
  }

  const handleDeleteRole = () => {
    if (!deleteTarget) return
    if (deleteConfirmName.trim() !== deleteTarget.name) return
    const { id, name } = deleteTarget
    deleteRole.mutate(id, {
      onSuccess: () => {
        toast.success(`Role "${name}" deleted`)
        setDeleteTarget(null)
        setDeleteConfirmName('')
      },
      onError: (err) => {
        if (!isPermissionError(err)) toast.error(getErrorMessage(err, 'Failed to delete role'))
      },
    })
  }

  return (
    <PermissionGuard entity="role" action="read" fallback={<RolesListNoPermission />}>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50/80 to-white">
          {/* Hero header */}
          <div className="relative overflow-hidden border-b border-slate-200/80 bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent" />
            <div className="relative mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-12">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/10">
                    <Shield className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      Roles & Permissions
                    </h1>
                    <p className="mt-1 max-w-xl text-slate-600">
                      Create and manage roles; control model-level and field-level access. Listed roles are current state from database.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700" title="Current state from database">
                        <Lock className="h-3.5 w-3.5" />
                        {roles.length} role{roles.length !== 1 ? 's' : ''} (current)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="gap-2 border-slate-200 hover:bg-slate-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  {canUpdate && (
                    <Button
                      size="sm"
                      onClick={() => setAddOpen(true)}
                      className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-violet-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add role
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {isLoading ? (
                <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                  <CardContent className="flex min-h-[320px] items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                      <Loader />
                      <p className="text-sm text-slate-500">Loading roles…</p>
                    </div>
                  </CardContent>
                </Card>
              ) : error ? (
                isPermissionError(error) ? (
                  <OperationNotPermitted context="You do not have permission to view roles." />
                ) : (
                  <Card className="overflow-hidden border-amber-200 bg-amber-50/50">
                    <CardContent className="py-12 text-center">
                      <p className="font-medium text-amber-900">
                        {getErrorMessage(error, 'Failed to load roles')}
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        If you believe you should have access, contact your administrator.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                        Try again
                      </Button>
                    </CardContent>
                  </Card>
                )
              ) : roles.length === 0 ? (
                <Card className="overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50/30">
                  <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Shield className="h-10 w-10" />
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-slate-800">No roles yet</h3>
                    <p className="mt-2 max-w-sm text-center text-sm text-slate-600">
                      {canUpdate
                        ? 'Create your first role to define who can do what. Then configure entity and field permissions.'
                        : 'Only users with role update permission can add roles.'}
                    </p>
                    {canUpdate && (
                      <Button
                        onClick={() => setAddOpen(true)}
                        className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add your first role
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {roles.map((role, i) => (
                      <motion.div
                        key={role.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        className="group"
                      >
                        <Card className="h-full overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200/80 hover:shadow-md hover:shadow-indigo-500/5">
                          <CardContent className="p-0">
                            <div className="flex flex-col p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-start gap-4">
                                  <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white shadow-md ${roleGradient(i)}`}
                                  >
                                    {role.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-slate-900">{role.name}</span>
                                    {role.description ? (
                                      <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                                        {role.description}
                                      </p>
                                    ) : (
                                      <p className="mt-1.5 text-sm italic text-slate-400">No description</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  {canUpdate && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleManagePermissions(role)}
                                      className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                      title="Edit permissions"
                                    >
                                      <ShieldCheck className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteTarget(role)}
                                      className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                                      title="Delete role"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {canUpdate && (
                                <button
                                  type="button"
                                  onClick={() => handleManagePermissions(role)}
                                  className={`relative mt-2 flex w-full items-center gap-2 overflow-hidden rounded-md border border-slate-200/80 bg-white py-2 pl-2.5 pr-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-md hover:shadow-slate-200/40 active:translate-y-0 group`}
                                >
                                  <span className={`absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b ${roleGradient(i)} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} aria-hidden />
                                  <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${roleGradient(i)} shadow-sm`}>
                                    <ShieldCheck className="h-3.5 w-3.5 text-white drop-shadow-sm" strokeWidth={2.25} />
                                  </div>
                                  <div className="relative min-w-0 flex-1">
                                    <span className="block text-xs font-semibold tracking-tight text-slate-800 group-hover:text-slate-900">
                                      Edit permissions
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                      <span className="rounded bg-slate-100 px-1 py-px font-medium text-slate-600">Entity</span>
                                      <span className="text-slate-300">·</span>
                                      <span className="rounded bg-slate-100 px-1 py-px font-medium text-slate-600">Field</span>
                                    </span>
                                  </div>
                                  <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 group-hover:bg-slate-200 group-hover:text-slate-700 group-hover:translate-x-0.5">
                                    <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                                  </div>
                                </button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Add role dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Add role</DialogTitle>
                  <DialogDescription>
                    Create a new role. Configure entity and field permissions after creation.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="role-name">Name</Label>
                <Input
                  id="role-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. manager, auditor"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role-desc">Description (optional)</Label>
                <Input
                  id="role-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of the role"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddRole}
                disabled={!newName.trim() || upsertRole.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {upsertRole.isPending ? 'Creating…' : 'Create role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation — requires typing role name to confirm */}
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null)
              setDeleteConfirmName('')
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-red-800">Delete role</DialogTitle>
                  <DialogDescription>
                    Deleting &quot;{deleteTarget?.name}&quot; cannot be undone. Users with this role will lose these permissions.
                    Type the role name below to confirm.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="delete-confirm-name">
                  Type role name to confirm
                </Label>
                <Input
                  id="delete-confirm-name"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Role name"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirmName('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={
                  deleteRole.isPending ||
                  deleteConfirmName.trim() !== (deleteTarget?.name ?? '')
                }
              >
                {deleteRole.isPending ? 'Deleting…' : 'Delete role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </PermissionGuard>
  )
}

function RolesListNoPermission() {
  const navigate = useNavigate()
  return (
    <DashboardLayout>
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <Card className="w-full max-w-md border-slate-200 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Access denied</CardTitle>
                <CardDescription>
                  You need read permission on roles to view this page. Contact an administrator.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full sm:w-auto">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
