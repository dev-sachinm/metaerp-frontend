import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AssignableRole, AssignableUser, ProjectAssignment } from '@/types/projectManagement'

interface AssignmentsTableProps {
  assignments: ProjectAssignment[]
  assignableUsers: AssignableUser[]
  assignableRoles: AssignableRole[]
  canRemove: boolean
  onRemove: (a: ProjectAssignment) => void
  removePending: boolean
}

function labelForAssignment(
  row: ProjectAssignment,
  users: AssignableUser[],
  roles: AssignableRole[]
): string {
  if (row.principalType === 'user') {
    const u = users.find((x) => x.id === row.principalId)
    if (!u) return row.principalId
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
    if (name && u.email) return `${name} (${u.email})`
    if (name) return name
    if (u.email) return u.email
    return u.username || row.principalId
  }

  const r = roles.find((x) => x.id === row.principalId)
  return r?.name ?? row.principalId
}

export function AssignmentsTable({
  assignments,
  assignableUsers,
  assignableRoles,
  canRemove,
  onRemove,
  removePending,
}: AssignmentsTableProps) {
  if (assignments.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">No assignments yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Principal Type</TableHead>
          <TableHead>Principal</TableHead>
          <TableHead>Assigned At</TableHead>
          <TableHead>Assigned By</TableHead>
          <TableHead className="w-[100px]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={`${a.projectId}-${a.principalType}-${a.principalId}`}>
            <TableCell className="capitalize">{a.principalType}</TableCell>
            <TableCell>{labelForAssignment(a, assignableUsers, assignableRoles)}</TableCell>
            <TableCell>{a.assignedAt ? new Date(a.assignedAt).toLocaleString() : '—'}</TableCell>
            <TableCell>{a.assignedByUsername ?? a.assignedBy ?? '—'}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canRemove || removePending}
                className="text-red-600 hover:text-red-700"
                onClick={() => onRemove(a)}
              >
                Remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
