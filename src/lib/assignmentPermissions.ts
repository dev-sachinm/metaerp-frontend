import type { PermissionsByRole } from '@/lib/permissions'

export interface AssignmentPermissions {
  canOpenAssignmentScreen: boolean
  canAssign: boolean
  canRemove: boolean
  canBulkAssign: boolean
}

/**
 * Compute assignment permissions from myPermissions.byRole.
 * Rule: OR across roles on project_assignment.update.
 */
export function getAssignmentPermissionsFromByRole(
  byRole: PermissionsByRole | null | undefined
): AssignmentPermissions {
  let canUpdateProjectAssignment = false

  if (byRole && typeof byRole === 'object') {
    for (const rolePerms of Object.values(byRole)) {
      if (!rolePerms || typeof rolePerms !== 'object') continue
      const pa = rolePerms.project_assignments
      if (pa?.update === true) {
        canUpdateProjectAssignment = true
        break
      }
    }
  }

  return {
    canOpenAssignmentScreen: canUpdateProjectAssignment,
    canAssign: canUpdateProjectAssignment,
    canRemove: canUpdateProjectAssignment,
    canBulkAssign: canUpdateProjectAssignment,
  }
}
