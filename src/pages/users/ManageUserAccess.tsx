/**
 * Manage User Access - Assign and remove roles for a user via drag and drop.
 * Data: user(userId) for assigned roles; getRoles() filtered in UI for available.
 * Mutations: addUserRole, removeUserRole.
 * Requires user.update permission.
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Loader } from '@/components/Loader'
import { useUser, userKeys } from '@/hooks/graphql/useUsersQuery'
import {
  useGetAllRoles,
  useAssignRoleToUser,
  useRemoveRoleFromUser,
  type Role,
} from '@/hooks/graphql/useUserRolesAccess'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ArrowLeft, UserCircle2, ShieldCheck, GripVertical, Shield } from 'lucide-react'

const ASSIGNED_ZONE = 'assigned'
const AVAILABLE_ZONE = 'available'

type ZoneId = typeof ASSIGNED_ZONE | typeof AVAILABLE_ZONE

function useAssignedAndAvailable(userId: string) {
  const { data: userData } = useUser(userId)
  const { data: rolesData, isLoading: rolesLoading } = useGetAllRoles()
  const user = userData?.user
  const allRoles = rolesData?.getRoles ?? []
  const userRoleSet = useMemo(
    () => new Set((user?.roles ?? []).flatMap((r) => [r.id, r.name])),
    [user?.roles]
  )
  const assignedRoles = useMemo(
    () => allRoles.filter((r) => userRoleSet.has(r.name) || userRoleSet.has(r.id)),
    [allRoles, userRoleSet]
  )
  const availableRoles = useMemo(
    () => allRoles.filter((r) => !userRoleSet.has(r.name) && !userRoleSet.has(r.id)),
    [allRoles, userRoleSet]
  )
  return { user, assignedRoles, availableRoles, rolesLoading }
}

function RoleCard({
  role,
  zone,
  isDragging,
  listeners,
  attributes,
  style,
}: {
  role: Role
  zone: ZoneId
  isDragging?: boolean
  listeners?: Record<string, unknown>
  attributes?: Record<string, unknown>
  style?: React.CSSProperties
}) {
  const isAssigned = zone === ASSIGNED_ZONE
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={style}
      className={`
        group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all duration-200
        ${isAssigned ? 'border-indigo-200/80 bg-indigo-50/30' : 'border-slate-200/80 hover:border-emerald-200/80'}
        ${isDragging ? 'cursor-grabbing shadow-lg ring-2 ring-indigo-400/50' : 'cursor-grab'}
      `}
    >
      <div
        className="touch-none rounded p-1 text-slate-400 opacity-60 group-hover:opacity-100"
        {...(listeners ?? {})}
        {...(attributes ?? {})}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">{role.name}</p>
        {role.description && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{role.description}</p>
        )}
      </div>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isAssigned ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Shield className="h-4 w-4" />
      </div>
    </motion.div>
  )
}

function DroppableZone({
  id,
  title,
  description,
  count,
  roles,
  zone,
  onRenderRole,
}: {
  id: ZoneId
  title: string
  description: string
  count: number
  roles: Role[]
  zone: ZoneId
  onRenderRole: (role: Role) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <Card
      ref={setNodeRef}
      className={`h-full overflow-hidden border-2 transition-all duration-200 ${
        isOver ? 'border-indigo-400 bg-indigo-50/50 shadow-lg' : 'border-slate-200/80 bg-slate-50/20'
      }`}
    >
      <CardHeader className="border-b border-slate-200/60 bg-white/80 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
          <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {count}
          </span>
        </div>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[280px] p-4">
        <div className="flex flex-col gap-2">
          {roles.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
              <ShieldCheck className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">No roles here</p>
              <p className="mt-1 text-xs text-slate-400">
                {zone === ASSIGNED_ZONE ? 'Drag roles from the right to assign' : 'All roles assigned — drag from the left to remove'}
              </p>
            </div>
          ) : (
            roles.map((role) => onRenderRole(role))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ManageUserAccess() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const userId = id ?? ''
  const { user, assignedRoles, availableRoles, rolesLoading } = useAssignedAndAvailable(userId)
  const assignRole = useAssignRoleToUser()
  const removeRole = useRemoveRoleFromUser()
  const [activeRole, setActiveRole] = useState<{ role: Role; zone: ZoneId } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const payload = active.data.current as { role: Role; zone: ZoneId } | undefined
    if (payload) setActiveRole(payload)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveRole(null)
      if (!over?.id || !userId) return
      const payload = active.data.current as { role: Role; zone: ZoneId } | undefined
      if (!payload) return
      const { role, zone: sourceZone } = payload
      const overId = String(over.id)
      // over may be the zone or a role card inside it (e.g. "assigned" or "assigned-role-uuid")
      const dropZone: ZoneId | null =
        overId === ASSIGNED_ZONE || overId.startsWith(ASSIGNED_ZONE + '-')
          ? ASSIGNED_ZONE
          : overId === AVAILABLE_ZONE || overId.startsWith(AVAILABLE_ZONE + '-')
            ? AVAILABLE_ZONE
            : null
      if (!dropZone) return

      if (sourceZone === AVAILABLE_ZONE && dropZone === ASSIGNED_ZONE) {
        // Optimistic update: move role to assigned so UI updates immediately
        queryClient.setQueryData<{ user: { roles?: { id: string; name: string }[] } }>(userKeys.detail(userId), (old) => {
          if (!old?.user) return old
          const roles = old.user.roles ?? []
          if (roles.some(r => r.id === role.id)) return old
          return { user: { ...old.user, roles: [...roles, { id: role.id, name: role.name }] } }
        })
        assignRole.mutate(
          { userId, roleId: role.id },
          {
            onSuccess: () => toast.success('Success', { description: `Role "${role.name}" assigned to user.` }),
            onError: (err) => {
              // Rollback optimistic update on error
              queryClient.setQueryData<{ user: { roles?: { id: string; name: string }[] } }>(userKeys.detail(userId), (old) => {
                if (!old?.user) return old
                const roles = (old.user.roles ?? []).filter((r) => r.id !== role.id)
                return { user: { ...old.user, roles } }
              })
              if (!isPermissionError(err)) {
                toast.error('Failed to assign role', {
                  description: getErrorMessage(err, 'Could not assign role. Please try again.'),
                })
              }
            },
          }
        )
      } else if (sourceZone === ASSIGNED_ZONE && dropZone === AVAILABLE_ZONE) {
        // Optimistic update: remove role from assigned so UI updates immediately
        queryClient.setQueryData<{ user: { roles?: { id: string; name: string }[] } }>(userKeys.detail(userId), (old) => {
          if (!old?.user) return old
          const roles = (old.user.roles ?? []).filter((r) => r.id !== role.id)
          return { user: { ...old.user, roles } }
        })
        removeRole.mutate(
          { userId, roleId: role.id },
          {
            onSuccess: () => toast.success('Success', { description: `Role "${role.name}" removed from user.` }),
            onError: (err) => {
              // Rollback: add role back to assigned
              queryClient.setQueryData<{ user: { roles?: { id: string; name: string }[] } }>(userKeys.detail(userId), (old) => {
                if (!old?.user) return old
                const roles = old.user.roles ?? []
                if (roles.some(r => r.id === role.id)) return old
                return { user: { ...old.user, roles: [...roles, { id: role.id, name: role.name }] } }
              })
              if (!isPermissionError(err)) {
                toast.error('Failed to remove role', {
                  description: getErrorMessage(err, 'Could not remove role. Please try again.'),
                })
              }
            },
          }
        )
      }
    },
    [userId, assignRole, removeRole, queryClient]
  )

  const isPending = assignRole.isPending || removeRole.isPending
  const displayName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || user?.username || 'User',
    [user]
  )

  if (!userId) {
    navigate('/users', { replace: true })
    return null
  }

  if (rolesLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <Loader />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <PermissionGuard entity="user" action="update" fallback={<ManageAccessNoPermission />}>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-8 flex items-center justify-between">
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-slate-50/50 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
                      <UserCircle2 className="h-7 w-7" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                        Manage access
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {displayName} · Drag roles between panels to assign or remove.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="grid gap-6 lg:grid-cols-2">
                  <DroppableZone
                    id={ASSIGNED_ZONE}
                    title="Roles assigned to this user"
                    description="From user(userId). Drag to the right panel to remove."
                    count={assignedRoles.length}
                    roles={assignedRoles}
                    zone={ASSIGNED_ZONE}
                    onRenderRole={(role) => (
                      <DraggableRoleCard key={role.id} role={role} zone={ASSIGNED_ZONE} />
                    )}
                  />
                  <DroppableZone
                    id={AVAILABLE_ZONE}
                    title="Available to assign"
                    description="From getRoles(), filtered in UI. Drag to the left to assign to user."
                    count={availableRoles.length}
                    roles={availableRoles}
                    zone={AVAILABLE_ZONE}
                    onRenderRole={(role) => (
                      <DraggableRoleCard key={role.id} role={role} zone={AVAILABLE_ZONE} />
                    )}
                  />
                </div>

                <DragOverlay dropAnimation={null}>
                  {activeRole ? (
                    <div className="rotate-2 scale-105 opacity-95">
                      <RoleCard role={activeRole.role} zone={activeRole.zone} isDragging />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {isPending && (
                <div className="flex justify-center py-4">
                  <Loader />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  )
}

function DraggableRoleCard({ role, zone }: { role: Role; zone: ZoneId }) {
  const id = `${zone}-${role.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { role, zone },
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  return (
    <div ref={setNodeRef} style={style}>
      <RoleCard
        role={role}
        zone={zone}
        isDragging={isDragging}
        listeners={listeners as unknown as Record<string, unknown>}
        attributes={attributes as unknown as Record<string, unknown>}
      />
    </div>
  )
}

function ManageAccessNoPermission() {
  const navigate = useNavigate()
  return (
    <DashboardLayout>
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="w-full max-w-md border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You need update permission on users to manage access. Contact an administrator.
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
