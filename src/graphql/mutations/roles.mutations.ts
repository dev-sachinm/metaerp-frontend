/**
 * Role Mutations - GraphQL mutations for role and permission management
 * Per BACKEND_IMPLEMENTATION_STATE.md: use getRolePermissions + upsertRoleWithPermissions.
 */

/**
 * Create or update a role with all its permissions in one transaction.
 * If roleId is null: creates new role. If roleId is set: updates role name/description and sets full permission state.
 * Requires update permission on role entity.
 */
export const UPSERT_ROLE_WITH_PERMISSIONS_MUTATION = `
  mutation UpsertRoleWithPermissions(
    $name: String!
    $roleId: String
    $description: String
    $entityPermissions: [EntityPermissionInput!]
    $fieldPermissions: [FieldPermissionInput!]
  ) {
    upsertRoleWithPermissions(
      name: $name
      roleId: $roleId
      description: $description
      entityPermissions: $entityPermissions
      fieldPermissions: $fieldPermissions
    ) {
      role {
        id
        name
        description
      }
      entityPermissions {
        id
        entityName
        canCreate
        canRead
        canUpdate
        canDelete
      }
      fieldPermissions {
        id
        entityName
        fieldName
        canRead
        canWrite
      }
    }
  }
`;

/**
 * Delete a role by id. Requires delete permission on role entity.
 * Note: Backend must expose deleteRole(roleId: String!): Boolean!
 */
export const DELETE_ROLE_MUTATION = `
  mutation DeleteRole($roleId: String!) {
    deleteRole(roleId: $roleId)
  }
`;

/**
 * @deprecated Use UPSERT_ROLE_WITH_PERMISSIONS_MUTATION with roleId set for updates.
 * Update entity and field permissions for a role (legacy).
 */
export const UPDATE_ROLE_PERMISSIONS_MUTATION = `
  mutation UpdateRolePermissions(
    $roleId: String!
    $entityPermissions: [EntityPermissionInput!]!
    $fieldPermissions: [FieldPermissionInput!]!
  ) {
    updateRolePermissions(
      roleId: $roleId
      entityPermissions: $entityPermissions
      fieldPermissions: $fieldPermissions
    ) {
      roleId
      roleName
      entityPermissions {
        id
        entityName
        canCreate
        canRead
        canUpdate
        canDelete
      }
      fieldPermissions {
        id
        entityName
        fieldName
        canRead
        canWrite
      }
    }
  }
`;
