import { useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/Loader'
import { AlertCircle } from 'lucide-react'
import { getErrorMessage } from '@/lib/graphqlErrors'
import { useMyPermissions } from '@/hooks/graphql/usePermissionsQuery'
import { getAssignmentPermissionsFromByRole } from '@/lib/assignmentPermissions'
import {
  useAssignProjectPrincipal,
  useProjectAssignmentBoard,
  useRemoveProjectPrincipal,
} from '@/hooks/graphql/useProjectAssignments'
import { AssignmentsTable } from '@/components/project-assignment/AssignmentsTable'
import { AssignPrincipalForm } from '@/components/project-assignment/AssignPrincipalForm'

interface AssignmentBoardProps {
  projectId: string
}

export function AssignmentBoard({ projectId }: AssignmentBoardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const boardQuery = useProjectAssignmentBoard(projectId)
  const assignMutation = useAssignProjectPrincipal()
  const removeMutation = useRemoveProjectPrincipal()
  const { data: myPermissionsData } = useMyPermissions()

  const permissions = useMemo(
    () => getAssignmentPermissionsFromByRole(myPermissionsData?.myPermissions?.byRole),
    [myPermissionsData]
  )

  if (boardQuery.isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <Loader />
      </div>
    )
  }

  if (boardQuery.isError || !boardQuery.data?.projectAssignmentBoard) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load assignment board</AlertTitle>
        <AlertDescription>
          {getErrorMessage(boardQuery.error, 'Failed to load project assignment board')}
        </AlertDescription>
      </Alert>
    )
  }

  const board = boardQuery.data.projectAssignmentBoard
  const project = board.project

  const canAssign = permissions.canAssign && (board.canAssign ?? true)
  const canRemove = permissions.canRemove
  const canBulkAssign = permissions.canBulkAssign && (board.canAssign ?? true)

  const handleAssign = async (payload: {
    projectId: string
    principalType: 'user' | 'role'
    principalId: string
    accessLevel: 'viewer' | 'editor' | 'owner'
  }) => {
    try {
      setErrorMessage(null)
      await assignMutation.mutateAsync(payload)
    } catch (e) {
      setErrorMessage(getErrorMessage(e, 'Failed to assign principal'))
    }
  }

  const handleBulkAssign = async (
    payloads: Array<{
      projectId: string
      principalType: 'user' | 'role'
      principalId: string
      accessLevel: 'viewer' | 'editor' | 'owner'
    }>
  ) => {
    try {
      setErrorMessage(null)
      for (const payload of payloads) {
        await assignMutation.mutateAsync(payload)
      }
    } catch (e) {
      setErrorMessage(getErrorMessage(e, 'Failed to bulk assign principals'))
    }
  }

  const handleRemove = async (row: { projectId: string; principalType: 'user' | 'role'; principalId: string }) => {
    try {
      setErrorMessage(null)
      await removeMutation.mutateAsync(row)
    } catch (e) {
      setErrorMessage(getErrorMessage(e, 'Failed to remove assignment'))
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 grid gap-2 md:grid-cols-4">
          <div><span className="font-medium">Number:</span> {project.projectNumber ?? '—'}</div>
          <div><span className="font-medium">Status:</span> {project.status ?? '—'}</div>
          <div><span className="font-medium">Target:</span> {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : '—'}</div>
          <div><span className="font-medium">Remaining:</span> {project.remainingDays ?? '—'} days</div>
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <AssignPrincipalForm
        projectId={projectId}
        assignments={board.assignments ?? []}
        assignableUsers={board.assignableUsers ?? []}
        assignableRoles={board.assignableRoles ?? []}
        canAssign={canAssign}
        canBulkAssign={canBulkAssign}
        isAssignPending={assignMutation.isPending}
        onAssign={handleAssign}
        onBulkAssign={handleBulkAssign}
        setError={setErrorMessage}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentsTable
            assignments={board.assignments ?? []}
            assignableUsers={board.assignableUsers ?? []}
            assignableRoles={board.assignableRoles ?? []}
            canRemove={canRemove}
            removePending={removeMutation.isPending}
            onRemove={(a) =>
              handleRemove({
                projectId: a.projectId,
                principalType: a.principalType,
                principalId: a.principalId,
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
