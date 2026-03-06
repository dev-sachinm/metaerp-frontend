/**
 * Manage Role Permissions - World-class UI for editing entity and field permissions
 * Requires role.update permission. Uses getRolePermissions query + upsertRoleWithPermissions mutation.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Command } from 'cmdk'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Loader } from '@/components/Loader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  useRoles,
  useUpsertRoleWithPermissions,
  type EntityPermissionInput,
  type FieldPermissionInput,
} from '@/hooks/graphql/useRolesQuery'
import {
  useRolePermissions,
  useEnumEntities,
  useEnumFields,
  type EntityPermission,
  type FieldPermission,
  type EntityEnumItem,
  type FieldEnumItem,
} from '@/hooks/graphql/usePermissionsQuery'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Shield,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Database,
  FileKey,
  AlertCircle,
  Search,
} from 'lucide-react'

function toInput(ep: EntityPermission): EntityPermissionInput {
  return {
    entityName: ep.entityName,
    canCreate: ep.canCreate,
    canRead: ep.canRead,
    canUpdate: ep.canUpdate,
    canDelete: ep.canDelete,
  }
}

function toFieldInput(fp: FieldPermission): FieldPermissionInput {
  return {
    entityName: fp.entityName,
    fieldName: fp.fieldName,
    canRead: fp.canRead,
    canWrite: fp.canWrite,
  }
}

export function ManageRolePermissions() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const roleId = id ?? ''

  const { data: rolesData } = useRoles()
  const role = useMemo(() => rolesData?.getRoles?.find((r) => r.id === roleId), [rolesData, roleId])

  const { data: rolePermsData, isLoading } = useRolePermissions(roleId)
  const { data: enumEntitiesData, isLoading: enumEntitiesLoading } = useEnumEntities()
  const upsertPermissions = useUpsertRoleWithPermissions()

  const enumEntities: EntityEnumItem[] = enumEntitiesData?.getEnumEntities ?? []
  const getEntityDisplayName = (key: string) =>
    enumEntitiesLoading ? '…' : (enumEntities.find((e) => e.key === key)?.displayName ?? '…')

  const [entityPerms, setEntityPerms] = useState<EntityPermissionInput[]>([])
  const [fieldPerms, setFieldPerms] = useState<FieldPermissionInput[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [entityFilter, setEntityFilter] = useState('')

  const filteredEntityPermsWithIndex = useMemo(() => {
    if (!entityFilter.trim()) return entityPerms.map((perm, i) => ({ perm, originalIndex: i }))
    const q = entityFilter.trim().toLowerCase()
    return entityPerms
      .map((perm, i) => ({ perm, originalIndex: i }))
      .filter(
        ({ perm: ep }) =>
          ep.entityName.toLowerCase().includes(q) ||
          (getEntityDisplayName(ep.entityName) ?? '').toLowerCase().includes(q)
      )
  }, [entityPerms, entityFilter, enumEntities, enumEntitiesLoading])

  // Source of truth: database. Sync local state from getRolePermissions whenever it changes.
  useEffect(() => {
    const rp = rolePermsData?.getRolePermissions
    if (!rolePermsData) return
    if (!rp) {
      setEntityPerms([])
      setFieldPerms([])
      return
    }
    setEntityPerms(rp.entityPermissions?.map(toInput) ?? [])
  }, [rolePermsData])

  useEffect(() => {
    const rp = rolePermsData?.getRolePermissions
    if (!rolePermsData || !rp) return
    setFieldPerms(rp.fieldPermissions?.map(toFieldInput) ?? [])
  }, [rolePermsData])

  const updateEntityPerm = useCallback((index: number, key: keyof EntityPermissionInput, value: boolean) => {
    setEntityPerms((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
    setHasChanges(true)
  }, [])

  const addEntity = useCallback((entityName: string) => {
    const name = entityName.trim().toLowerCase()
    if (!name || entityPerms.some((e) => e.entityName === name)) return
    setEntityPerms((prev) => [...prev, { entityName: name, canCreate: false, canRead: false, canUpdate: false, canDelete: false }])
    setHasChanges(true)
  }, [entityPerms])

  const removeEntity = useCallback((index: number) => {
    setEntityPerms((prev) => prev.filter((_, i) => i !== index))
    setFieldPerms((prev) => prev.filter((fp) => fp.entityName !== entityPerms[index]?.entityName))
    setHasChanges(true)
  }, [entityPerms])

  const updateFieldPerm = useCallback((index: number, key: 'canRead' | 'canWrite', value: boolean) => {
    setFieldPerms((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
    setHasChanges(true)
  }, [])

  const addField = useCallback((entityName: string, fieldName: string) => {
    const e = entityName.trim().toLowerCase()
    const f = fieldName.trim()
    if (!e || !f || fieldPerms.some((fp) => fp.entityName === e && fp.fieldName === f)) return
    setFieldPerms((prev) => [...prev, { entityName: e, fieldName: f, canRead: false, canWrite: false }])
    setHasChanges(true)
  }, [fieldPerms])

  const removeField = useCallback((index: number) => {
    setFieldPerms((prev) => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!roleId || !role) return
    upsertPermissions.mutate(
      {
        name: role.name,
        roleId,
        description: role.description ?? undefined,
        entityPermissions: entityPerms,
        fieldPermissions: fieldPerms,
      },
      {
        onSuccess: () => {
          toast.success('Permissions updated successfully')
          setHasChanges(false)
        },
        onError: (err) => {
          if (!isPermissionError(err)) toast.error(getErrorMessage(err, 'Failed to update permissions'))
        },
      }
    )
  }, [roleId, role, entityPerms, fieldPerms, upsertPermissions])

  if (!roleId) {
    navigate('/roles', { replace: true })
    return null
  }

  if (isLoading || !role) {
    return (
      <DashboardLayout>
        <div className="p-8 flex justify-center items-center min-h-[400px]">
          {!role && !isLoading ? (
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Role not found</CardTitle>
                <CardDescription>
                  The role could not be loaded. It may have been deleted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/roles')} variant="outline">
                  Back to Roles
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Loader />
          )}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <PermissionGuard entity="role" action="update" fallback={<ManagePermissionsNoPermission />}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/roles')}
              className="gap-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Roles & Permissions
            </Button>
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {hasChanges && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 text-amber-600 text-sm"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Unsaved changes</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || upsertPermissions.isPending}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25"
              >
                <Save className="h-4 w-4" />
                {upsertPermissions.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Role hero with summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="overflow-hidden border-slate-200/80 shadow-md bg-gradient-to-br from-violet-50/60 via-indigo-50/40 to-white">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/10">
                      <Shield className="h-8 w-8" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        <span className="text-violet-600">{role.name}</span>
                      </h1>
                      <p className="mt-1 text-slate-600">
                        {role.description || 'Configure entity and field-level access for this role'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60" title="Current state from database">
                          <Database className="h-4 w-4 text-indigo-500" />
                          {entityPerms.length} entit{entityPerms.length === 1 ? 'y' : 'ies'} (current)
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60" title="Current state from database">
                          <FileKey className="h-4 w-4 text-violet-500" />
                          {fieldPerms.length} field{fieldPerms.length !== 1 ? 's' : ''} (current)
                        </span>
                        <span className="text-xs text-slate-500 self-center">Source of truth: database</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Entity Permissions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden border-slate-200/80 shadow-sm h-full">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Entity-Level permissions</CardTitle>
                        <CardDescription className="mt-0.5">
                          Current state from database · Create, Read, Update, Delete per entity
                        </CardDescription>
                      </div>
                    </div>
                    <AddEntityDialog onAdd={addEntity} enumEntities={enumEntities} existing={entityPerms.map((e) => e.entityName)} />
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {entityPerms.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Database className="h-7 w-7" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-slate-600">No entity permissions yet</p>
                      <p className="mt-1 text-xs text-slate-500">Add an entity to define CRUD access for this role</p>
                      <AddEntityDialog onAdd={addEntity} enumEntities={enumEntities} existing={[]} triggerClassName="mt-5" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Filter entities…"
                          value={entityFilter}
                          onChange={(e) => setEntityFilter(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <VirtualizedEntityPermList
                        items={filteredEntityPermsWithIndex}
                        enumEntities={enumEntities}
                        onUpdate={updateEntityPerm}
                        onRemove={removeEntity}
                        disabled={upsertPermissions.isPending}
                        emptyMessage={entityFilter.trim() ? 'No entities match the filter' : undefined}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Field Permissions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="overflow-hidden border-slate-200/80 shadow-sm h-full">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <FileKey className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Field-Level permissions</CardTitle>
                      <CardDescription className="mt-0.5">
                        Current state from database · Read and write access per field
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <FieldPermissionsSection
                    fieldPerms={fieldPerms}
                    entityPerms={entityPerms}
                    onUpdate={updateFieldPerm}
                    onAdd={addField}
                    onRemove={removeField}
                    disabled={upsertPermissions.isPending}
                    enumEntities={enumEntities}
                    getEntityDisplayName={getEntityDisplayName}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  )
}

function FieldRowsWithDisplayNames({
  entityKey,
  rows,
  onUpdate,
  onRemove,
  disabled,
}: {
  entityKey: string
  rows: { index: number; perm: FieldPermissionInput }[]
  onUpdate: (index: number, key: 'canRead' | 'canWrite', value: boolean) => void
  onRemove: (index: number) => void
  disabled: boolean
}) {
  const { data: fieldsData } = useEnumFields(entityKey)
  const fieldItems = fieldsData?.getEnumFields ?? []
  const getDisplayName = (fieldKey: string) => fieldItems.find((f) => f.key === fieldKey)?.displayName ?? '…'
  return (
    <>
      {rows.map(({ index, perm }) => (
        <div key={`${perm.entityName}-${perm.fieldName}-${index}`} className="flex items-center gap-4">
          <span className="flex-1 text-sm text-slate-700">
            {getDisplayName(perm.fieldName)}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={perm.canRead} onCheckedChange={(v) => onUpdate(index, 'canRead', v)} disabled={disabled} />
              <span className="text-xs text-slate-500">Read</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={perm.canWrite} onCheckedChange={(v) => onUpdate(index, 'canWrite', v)} disabled={disabled} />
              <span className="text-xs text-slate-500">Write</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)} disabled={disabled} className="text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </>
  )
}

const ROW_HEIGHT = 72
const FIELD_ENTITY_ROW_COLLAPSED = 52
const FIELD_ENTITY_ROW_EXPANDED = 320

function VirtualizedFieldEntityList({
  entityNames,
  byEntity,
  expandedEntity,
  setExpandedEntity,
  getEntityDisplayName,
  entityPerms,
  fieldPerms,
  enumEntities,
  onUpdate,
  onRemove,
  onAdd,
  disabled,
  emptyMessage,
}: {
  entityNames: string[]
  byEntity: Record<string, { index: number; perm: FieldPermissionInput }[]>
  expandedEntity: string | null
  setExpandedEntity: (e: string | null) => void
  getEntityDisplayName: (key: string) => string
  entityPerms: EntityPermissionInput[]
  fieldPerms: FieldPermissionInput[]
  enumEntities: EntityEnumItem[]
  onUpdate: (index: number, key: 'canRead' | 'canWrite', value: boolean) => void
  onRemove: (index: number) => void
  onAdd: (entityName: string, fieldName: string) => void
  disabled: boolean
  emptyMessage?: string
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: entityNames.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (expandedEntity === entityNames[index] ? FIELD_ENTITY_ROW_EXPANDED : FIELD_ENTITY_ROW_COLLAPSED),
    overscan: 3,
  })
  if (entityNames.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        {emptyMessage ?? 'No field permissions'}
      </p>
    )
  }
  return (
    <div ref={parentRef} className="h-[min(400px,50vh)] overflow-auto rounded-lg border border-slate-200">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        className="w-full"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entityName = entityNames[virtualRow.index]
          const rows = byEntity[entityName] ?? []
          return (
            <div
              key={entityName}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-1 pb-1"
            >
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedEntity(expandedEntity === entityName ? null : entityName)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  {expandedEntity === entityName ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                  <Badge variant="secondary">{getEntityDisplayName(entityName)}</Badge>
                  <span className="text-sm text-slate-500">
                    {rows.length} field{rows.length !== 1 ? 's' : ''}
                  </span>
                </button>
                <AnimatePresence>
                  {expandedEntity === entityName && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100"
                    >
                      <div className="p-4 space-y-3">
                        <FieldRowsWithDisplayNames
                          entityKey={entityName}
                          rows={rows}
                          onUpdate={onUpdate}
                          onRemove={onRemove}
                          disabled={disabled}
                        />
                        <AddFieldDialog
                          enumEntities={enumEntities}
                          existingEntityPerms={entityPerms.map((e) => e.entityName)}
                          existingFieldPerms={fieldPerms}
                          onAdd={onAdd}
                          entityPreSelect={entityName}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VirtualizedEntityPermList({
  items,
  enumEntities,
  onUpdate,
  onRemove,
  disabled,
  emptyMessage,
}: {
  items: { perm: EntityPermissionInput; originalIndex: number }[]
  enumEntities: EntityEnumItem[]
  onUpdate: (index: number, key: keyof EntityPermissionInput, value: boolean) => void
  onRemove: (index: number) => void
  disabled: boolean
  emptyMessage?: string
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        {emptyMessage ?? 'No entities'}
      </p>
    )
  }
  return (
    <div ref={parentRef} className="h-[min(400px,60vh)] overflow-auto rounded-lg border border-slate-200">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        className="w-full"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const { perm, originalIndex } = items[virtualRow.index]
          const displayName = enumEntities.find((e) => e.key === perm.entityName)?.displayName ?? perm.entityName
          return (
            <div
              key={`${perm.entityName}-${originalIndex}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-1"
            >
              <EntityPermissionRow
                perm={perm}
                displayName={displayName}
                onUpdate={(k, v) => onUpdate(originalIndex, k, v)}
                onRemove={() => onRemove(originalIndex)}
                disabled={disabled}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EntityPermissionRow({
  perm,
  displayName,
  onUpdate,
  onRemove,
  disabled,
}: {
  perm: EntityPermissionInput
  displayName: string
  onUpdate: (key: keyof EntityPermissionInput, value: boolean) => void
  onRemove: () => void
  disabled: boolean
}) {
  const crud = [
    { key: 'canCreate' as const, label: 'Create', short: 'C' },
    { key: 'canRead' as const, label: 'Read', short: 'R' },
    { key: 'canUpdate' as const, label: 'Update', short: 'U' },
    { key: 'canDelete' as const, label: 'Delete', short: 'D' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200/50 transition-shadow hover:ring-slate-300/60">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-[120px]">
        <Badge variant="secondary" className="text-sm" title={perm.entityName}>
          {displayName}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {crud.map(({ key, label, short }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              checked={perm[key]}
              onCheckedChange={(v) => onUpdate(key, v)}
              disabled={disabled}
            />
            <span className="text-xs font-medium text-slate-600" title={label}>
              {short}
            </span>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
        className="shrink-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="Remove entity"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function AddEntityDialog({
  onAdd,
  enumEntities,
  existing,
  triggerClassName,
}: {
  onAdd: (entityKey: string) => void
  enumEntities: EntityEnumItem[]
  existing: string[]
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const available = useMemo(
    () => enumEntities.filter((e) => !existing.includes(e.key)),
    [enumEntities, existing]
  )
  const filtered = useMemo(() => {
    if (!search.trim()) return available
    const q = search.trim().toLowerCase()
    return available.filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        (e.displayName ?? '').toLowerCase().includes(q)
    )
  }, [available, search])

  const selectAll = useCallback(() => {
    setSelectedKeys(filtered.map((e) => e.key))
  }, [filtered])

  const clearAll = useCallback(() => {
    setSelectedKeys([])
  }, [])

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  const handleAddSelected = useCallback(() => {
    selectedKeys.forEach((key) => onAdd(key))
    setSelectedKeys([])
    setSearch('')
    setOpen(false)
  }, [selectedKeys, onAdd])

  const handleOpenChange = useCallback(
    (o: boolean) => {
      setOpen(o)
      if (!o) {
        setSearch('')
        setSelectedKeys([])
      }
    },
    []
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 ${triggerClassName ?? ''}`} disabled={available.length === 0}>
          <Plus className="h-4 w-4" />
          Add Entity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add entity permissions</DialogTitle>
          <DialogDescription>
            Search and select one or more entities. Use Select all / Clear all, then Add selected.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <Search className="h-4 w-4 text-slate-400 ml-3" />
            <Input
              placeholder="Search entities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 rounded-none focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              Clear all
            </Button>
            {selectedKeys.length > 0 && (
              <span className="text-sm text-slate-500">
                {selectedKeys.length} selected
              </span>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 max-h-[280px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No entity found.</p>
            ) : (
              filtered.map((e) => (
                <label
                  key={e.key}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50 has-[:checked]:bg-indigo-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(e.key)}
                    onChange={() => toggleKey(e.key)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-800">{e.displayName}</span>
                  <span className="text-xs text-slate-400">{e.key}</span>
                </label>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedKeys.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add selected ({selectedKeys.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldPermissionsSection({
  fieldPerms,
  entityPerms,
  onUpdate,
  onAdd,
  onRemove,
  disabled,
  enumEntities,
  getEntityDisplayName,
}: {
  fieldPerms: FieldPermissionInput[]
  entityPerms: EntityPermissionInput[]
  onUpdate: (index: number, key: 'canRead' | 'canWrite', value: boolean) => void
  onAdd: (entityName: string, fieldName: string) => void
  onRemove: (index: number) => void
  disabled: boolean
  enumEntities: EntityEnumItem[]
  getEntityDisplayName: (key: string) => string
}) {
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null)
  const [fieldSectionFilter, setFieldSectionFilter] = useState('')
  const byEntity = useMemo(() => {
    const map: Record<string, { index: number; perm: FieldPermissionInput }[]> = {}
    fieldPerms.forEach((fp, i) => {
      if (!map[fp.entityName]) map[fp.entityName] = []
      map[fp.entityName].push({ index: i, perm: fp })
    })
    return map
  }, [fieldPerms])

  const entitiesWithFields = useMemo(() => Object.keys(byEntity), [byEntity])
  const filteredEntitiesWithFields = useMemo(() => {
    if (!fieldSectionFilter.trim()) return entitiesWithFields
    const q = fieldSectionFilter.trim().toLowerCase()
    return entitiesWithFields.filter(
      (name) =>
        name.toLowerCase().includes(q) ||
        (getEntityDisplayName(name) ?? '').toLowerCase().includes(q)
    )
  }, [entitiesWithFields, fieldSectionFilter, getEntityDisplayName])

  if (entitiesWithFields.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 rounded-lg border-2 border-dashed border-slate-200">
        <FileKey className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No field permissions</p>
        <p className="text-xs mt-1">Add fields via the dialog below</p>
        <AddFieldDialog
          enumEntities={enumEntities}
          existingEntityPerms={entityPerms.map((e) => e.entityName)}
          existingFieldPerms={fieldPerms}
          onAdd={onAdd}
          triggerClassName="mt-4"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Filter entities with field permissions…"
          value={fieldSectionFilter}
          onChange={(e) => setFieldSectionFilter(e.target.value)}
          className="pl-9"
        />
      </div>
      <VirtualizedFieldEntityList
        entityNames={filteredEntitiesWithFields}
        byEntity={byEntity}
        expandedEntity={expandedEntity}
        setExpandedEntity={setExpandedEntity}
        getEntityDisplayName={getEntityDisplayName}
        entityPerms={entityPerms}
        fieldPerms={fieldPerms}
        enumEntities={enumEntities}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onAdd={onAdd}
        disabled={disabled}
        emptyMessage={fieldSectionFilter.trim() ? 'No entities match the filter' : undefined}
      />
      <AddFieldDialog
        enumEntities={enumEntities}
        existingEntityPerms={entityPerms.map((e) => e.entityName)}
        existingFieldPerms={fieldPerms}
        onAdd={onAdd}
        triggerClassName="w-full"
      />
    </div>
  )
}

function AddFieldDialog({
  enumEntities,
  existingEntityPerms,
  existingFieldPerms,
  onAdd,
  entityPreSelect,
  triggerClassName,
}: {
  enumEntities: EntityEnumItem[]
  existingEntityPerms: string[]
  existingFieldPerms: { entityName: string; fieldName: string }[]
  onAdd: (entityName: string, fieldName: string) => void
  entityPreSelect?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [entity, setEntity] = useState(entityPreSelect ?? '')
  const [entitySearch, setEntitySearch] = useState('')
  const [fieldSearch, setFieldSearch] = useState('')
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([])
  const { data: fieldsData } = useEnumFields(entity)
  const allFields: FieldEnumItem[] = entity ? (fieldsData?.getEnumFields ?? []) : []
  const alreadyAdded = useMemo(
    () => existingFieldPerms.filter((fp) => fp.entityName === entity).map((fp) => fp.fieldName),
    [existingFieldPerms, entity]
  )
  const enumFields = useMemo(() => allFields.filter((f) => !alreadyAdded.includes(f.key)), [allFields, alreadyAdded])
  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return enumFields
    const q = fieldSearch.trim().toLowerCase()
    return enumFields.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        (f.displayName ?? '').toLowerCase().includes(q)
    )
  }, [enumFields, fieldSearch])
  const entityOptions: EntityEnumItem[] = useMemo(
    () =>
      existingEntityPerms.length > 0
        ? existingEntityPerms.map((key) => ({
            key,
            displayName: enumEntities.find((e) => e.key === key)?.displayName ?? key,
          }))
        : enumEntities,
    [existingEntityPerms, enumEntities]
  )

  useEffect(() => {
    if (entityPreSelect) setEntity(entityPreSelect)
  }, [entityPreSelect])
  useEffect(() => {
    setFieldSearch('')
    setSelectedFieldKeys([])
  }, [entity])

  const selectAllFields = useCallback(() => {
    setSelectedFieldKeys(filteredFields.map((f) => f.key))
  }, [filteredFields])

  const clearAllFields = useCallback(() => {
    setSelectedFieldKeys([])
  }, [])

  const toggleFieldKey = useCallback((key: string) => {
    setSelectedFieldKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  const handleAddSelected = useCallback(() => {
    if (!entity) return
    selectedFieldKeys.forEach((fieldKey) => onAdd(entity, fieldKey))
    setSelectedFieldKeys([])
    setFieldSearch('')
    setOpen(false)
  }, [entity, selectedFieldKeys, onAdd])

  const handleOpenChange = useCallback(
    (o: boolean) => {
      setOpen(o)
      if (!o) {
        setEntity('')
        setEntitySearch('')
        setFieldSearch('')
        setSelectedFieldKeys([])
      }
    },
    []
  )

  const canAdd = entityOptions.length > 0 && enumEntities.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 ${triggerClassName ?? ''}`} disabled={!canAdd}>
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add field permissions</DialogTitle>
          <DialogDescription>
            Select an entity, then select one or more fields. Use Select all / Clear all, then Add selected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Entity</Label>
            <Command
              className="rounded-lg border border-slate-200 overflow-hidden"
              shouldFilter={true}
            >
              <div className="flex items-center border-b border-slate-100 px-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Command.Input
                  placeholder="Search entities…"
                  value={entitySearch}
                  onValueChange={setEntitySearch}
                  className="flex h-10 w-full rounded-md border-0 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <Command.List className="max-h-[200px] overflow-y-auto p-1">
                <Command.Empty className="py-4 text-center text-sm text-slate-500">No entity found.</Command.Empty>
                {entityOptions.map((e) => (
                  <Command.Item
                    key={e.key}
                    value={`${e.displayName} ${e.key}`}
                    onSelect={() => setEntity(e.key)}
                    className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm outline-none aria-selected:bg-slate-100"
                  >
                    <span className="font-medium text-slate-800">{e.displayName}</span>
                    <span className="ml-2 text-xs text-slate-400">{e.key}</span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
          <div className="space-y-1.5">
            <Label>Fields {entity ? `(${enumEntities.find((e) => e.key === entity)?.displayName ?? entity})` : ''}</Label>
            {!entity ? (
              <p className="text-sm text-slate-500 py-2">Select an entity first.</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-1">
                    <Search className="h-4 w-4 text-slate-400 ml-3" />
                    <Input
                      placeholder="Search fields…"
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      className="border-0 rounded-none focus-visible:ring-0 h-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllFields}>
                    Select all
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAllFields}>
                    Clear all
                  </Button>
                  {selectedFieldKeys.length > 0 && (
                    <span className="text-sm text-slate-500">
                      {selectedFieldKeys.length} selected
                    </span>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 max-h-[200px] overflow-y-auto p-1">
                  {filteredFields.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-500">No field found.</p>
                  ) : (
                    filteredFields.map((f) => (
                      <label
                        key={f.key}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50 has-[:checked]:bg-violet-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFieldKeys.includes(f.key)}
                          onChange={() => toggleFieldKey(f.key)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="font-medium text-slate-800">{f.displayName}</span>
                        <span className="text-xs text-slate-400">{f.key}</span>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={!entity || selectedFieldKeys.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add selected ({selectedFieldKeys.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManagePermissionsNoPermission() {
  const navigate = useNavigate()
  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You need update permission on roles to manage permissions. Contact an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/roles')} variant="outline">
              Back to Roles
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
