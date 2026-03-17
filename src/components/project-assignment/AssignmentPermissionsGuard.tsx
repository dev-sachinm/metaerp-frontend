import { ReactNode } from 'react'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { useMyPermissions } from '@/hooks/graphql/usePermissionsQuery'
import { getAssignmentPermissionsFromByRole } from '@/lib/assignmentPermissions'

interface AssignmentPermissionsGuardProps {
  children: ReactNode
}

export function AssignmentPermissionsGuard({ children }: AssignmentPermissionsGuardProps) {
  const { data, isLoading } = useMyPermissions()

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <Loader />
      </div>
    )
  }

  const byRole = data?.myPermissions?.byRole
  const { canOpenAssignmentScreen } = getAssignmentPermissionsFromByRole(byRole)

  if (!canOpenAssignmentScreen) {
    return (
      <OperationNotPermitted context="You don’t have permission to manage project assignments." />
    )
  }

  return <>{children}</>
}
