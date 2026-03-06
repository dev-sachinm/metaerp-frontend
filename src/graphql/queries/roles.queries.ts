/**
 * Role Queries - GraphQL queries for role operations
 * Per BACKEND_IMPLEMENTATION_STATE.md: getRoles(roleId) returns [RoleType!]! (array, no pagination).
 */

import { RoleFieldsFragment } from '../fragments/role.fragments';

/**
 * Get all roles, or a single role when roleId is provided.
 * @param roleId - Optional; when set, returns that role only.
 */
export const GET_ROLES = `
  ${RoleFieldsFragment}
  query GetRoles($roleId: String) {
    getRoles(roleId: $roleId) {
      ...RoleFields
    }
  }
`;
