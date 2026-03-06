/**
 * Permission Queries - GraphQL queries for permission operations
 * Aligned with BACKEND_IMPLEMENTATION_STATE.md (source of truth for permissions API).
 */

import { EntityPermissionFieldsFragment, FieldPermissionFieldsFragment } from '../fragments/permission.fragments';

/**
 * Get current user's permissions grouped by role (same shape as login.permissions).
 * Returns byRole: { roleName: { entityName: { create, read, update, delete, fields } } }.
 */
export const GET_MY_PERMISSIONS = `
  query GetMyPermissions {
    myPermissions {
      byRole
    }
  }
`;

/**
 * Get entity-level permissions for a specific role. Admin only.
 * @param roleId - Role ID (e.g. "role-002")
 * @param skip - Number of records to skip
 * @param limit - Number of records to return (e.g. 50)
 */
export const GET_ENTITY_PERMISSIONS = `
  ${EntityPermissionFieldsFragment}
  query GetEntityPermissions($roleId: String!, $skip: Int!, $limit: Int!) {
    entityPermissions(roleId: $roleId, skip: $skip, limit: $limit) {
      items {
        ...EntityPermissionFields
      }
      total
      skip
      limit
      page
      totalPages
      hasMore
    }
  }
`;

/**
 * Get roles and permissions for a specific user. Requires read permission on user entity.
 * Returns roles (id, name, description) and permissions (byRole).
 * @param userId - User ID (UUID)
 */
export const USER_ROLES_AND_PERMISSIONS = `
  query UserRolesAndPermissions($userId: String!) {
    userRolesAndPermissions(userId: $userId) {
      userId
      roles {
        id
        name
        description
      }
      permissions {
        byRole
      }
    }
  }
`;

/**
 * Get field-level permissions for a specific role. Admin only.
 * @param roleId - Role ID (e.g. "role-002")
 * @param skip - Number of records to skip
 * @param limit - Number of records to return (e.g. 100)
 */
export const GET_FIELD_PERMISSIONS = `
  ${FieldPermissionFieldsFragment}
  query GetFieldPermissions($roleId: String!, $skip: Int!, $limit: Int!) {
    fieldPermissions(roleId: $roleId, skip: $skip, limit: $limit) {
      items {
        ...FieldPermissionFields
      }
      total
      skip
      limit
      page
      totalPages
      hasMore
    }
  }
`;

/**
 * All permission-managed entities from backend EntityEnum.
 * Per BACKEND_IMPLEMENTATION_STATE.md: getEnumEntities returns [EntityEnumItem!]! (key, displayName).
 */
export const GET_ENUM_ENTITIES = `
  query GetEnumEntities {
    getEnumEntities {
      key
      displayName
    }
  }
`;

/**
 * Fields for a given entity from backend FieldEnum.
 * Per BACKEND_IMPLEMENTATION_STATE.md: getEnumFields(entityId) returns [FieldEnumItem!]! (key, displayName).
 */
export const GET_ENUM_FIELDS = `
  query GetEnumFields($entityId: String!) {
    getEnumFields(entityId: $entityId) {
      key
      displayName
    }
  }
`;

/**
 * Get role with all its entity and field permissions in one call.
 * Per BACKEND_IMPLEMENTATION_STATE.md: getRolePermissions(roleId) returns RoleWithPermissionsType.
 */
export const GET_ROLE_PERMISSIONS = `
  ${EntityPermissionFieldsFragment}
  ${FieldPermissionFieldsFragment}
  query GetRolePermissions($roleId: String!) {
    getRolePermissions(roleId: $roleId) {
      role {
        id
        name
        description
      }
      entityPermissions {
        ...EntityPermissionFields
      }
      fieldPermissions {
        ...FieldPermissionFields
      }
    }
  }
`;
