import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  AccessLevel,
  AssignableRole,
  AssignableUser,
  PrincipalType,
  ProjectAssignment,
} from '@/types/projectManagement'

interface AssignPrincipalFormProps {
  projectId: string
  assignments: ProjectAssignment[]
  assignableUsers: AssignableUser[]
  assignableRoles: AssignableRole[]
  canAssign: boolean
  canBulkAssign: boolean
  isAssignPending: boolean
  onAssign: (payload: {
    projectId: string
    principalType: PrincipalType
    principalId: string
    accessLevel: AccessLevel
  }) => Promise<void>
  onBulkAssign: (payloads: Array<{
    projectId: string
    principalType: PrincipalType
    principalId: string
    accessLevel: AccessLevel
  }>) => Promise<void>
  setError: (message: string | null) => void
}

export function AssignPrincipalForm({
  projectId,
  assignments,
  assignableUsers,
  assignableRoles,
  canAssign,
  canBulkAssign,
  isAssignPending,
  onAssign,
  onBulkAssign,
  setError,
}: AssignPrincipalFormProps) {
  const [principalType, setPrincipalType] = useState<PrincipalType>('user')
  const [principalId, setPrincipalId] = useState('')
  const [bulkPrincipalType, setBulkPrincipalType] = useState<PrincipalType>('user')
  const [bulkSelection, setBulkSelection] = useState<string[]>([])

  const principalOptions = principalType === 'user' ? assignableUsers : assignableRoles
  const bulkOptions = bulkPrincipalType === 'user' ? assignableUsers : assignableRoles

  const existingKeys = useMemo(
    () =>
      new Set(assignments.map((a) => `${a.principalType}:${a.principalId}`)),
    [assignments]
  )

  const toggleBulk = (id: string) => {
    setBulkSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const submitSingle = async () => {
    setError(null)
    if (!principalId) {
      setError('Please select a principal before assigning.')
      return
    }

    const key = `${principalType}:${principalId}`
    if (existingKeys.has(key)) {
      setError('This principal is already assigned to the project.')
      return
    }

    await onAssign({ projectId, principalType, principalId, accessLevel: 'viewer' })
    setPrincipalId('')
  }

  const submitBulk = async () => {
    setError(null)
    if (bulkSelection.length === 0) {
      setError('Please select at least one principal for bulk assign.')
      return
    }

    const unique = [...new Set(bulkSelection)]
    if (unique.length !== bulkSelection.length) {
      setError('Duplicate principal selection is not allowed.')
      return
    }

    const payloads = unique
      .filter((principalIdItem) => !existingKeys.has(`${bulkPrincipalType}:${principalIdItem}`))
      .map((principalIdItem) => ({
        projectId,
        principalType: bulkPrincipalType,
        principalId: principalIdItem,
        accessLevel: 'viewer' as AccessLevel,
      }))

    if (payloads.length === 0) {
      setError('All selected principals are already assigned.')
      return
    }

    await onBulkAssign(payloads)
    setBulkSelection([])
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign Principal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={principalType}
            onChange={(e) => {
              setPrincipalType(e.target.value as PrincipalType)
              setPrincipalId('')
            }}
            disabled={!canAssign}
          >
            <option value="user">User</option>
            <option value="role">Role</option>
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={principalId}
            onChange={(e) => setPrincipalId(e.target.value)}
            disabled={!canAssign}
          >
            <option value="">Select {principalType}</option>
            {principalOptions.map((p) => {
              let label = ''
              if (principalType === 'user') {
                const u = p as AssignableUser
                const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
                label = name && u.email ? `${name} (${u.email})` : name || u.email || u.username || u.id
              } else {
                label = (p as AssignableRole).name
              }
              return (
                <option key={p.id} value={p.id}>
                  {label}
                </option>
              )
            })}
          </select>

          <Button onClick={submitSingle} disabled={!canAssign || isAssignPending}>
            {isAssignPending ? 'Assigning…' : 'Assign'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk Assign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={bulkPrincipalType}
              onChange={(e) => {
                setBulkPrincipalType(e.target.value as PrincipalType)
                setBulkSelection([])
              }}
              disabled={!canBulkAssign}
            >
              <option value="user">User</option>
              <option value="role">Role</option>
            </select>
            <Button onClick={submitBulk} disabled={!canBulkAssign || isAssignPending}>
              {isAssignPending ? 'Applying…' : 'Assign Selected'}
            </Button>
          </div>

          <div className="max-h-48 overflow-auto rounded-md border border-slate-200 p-2 space-y-2">
            {bulkOptions.map((p) => {
              const id = p.id
              let label = ''
              if (bulkPrincipalType === 'user') {
                const u = p as AssignableUser
                const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
                label = name && u.email ? `${name} (${u.email})` : name || u.email || u.username || u.id
              } else {
                label = (p as AssignableRole).name
              }
              return (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bulkSelection.includes(id)}
                    onChange={() => toggleBulk(id)}
                    disabled={!canBulkAssign}
                  />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
