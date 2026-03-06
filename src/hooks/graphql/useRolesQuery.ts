/**
 * Roles Query Hooks - React Query hooks for role operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeGraphQL } from '@/graphql/client';
import { GET_ROLES } from '@/graphql/queries/roles.queries';
import { DELETE_ROLE_MUTATION, UPDATE_ROLE_PERMISSIONS_MUTATION, UPSERT_ROLE_WITH_PERMISSIONS_MUTATION } from '@/graphql/mutations/roles.mutations';

export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

interface GetRolesResponse {
  getRoles: Role[];
}

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (roleId?: string | null) => [...roleKeys.lists(), roleId ?? 'all'] as const,
};

/** Fetch all roles, or one role when roleId is passed. */
export function useRoles(roleId?: string | null) {
  return useQuery({
    queryKey: roleKeys.list(roleId),
    queryFn: () =>
      executeGraphQL<GetRolesResponse>(GET_ROLES, roleId ? { roleId } : {}),
    staleTime: 5 * 60 * 1000,
  });
}

export interface EntityPermissionInput {
  entityName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface FieldPermissionInput {
  entityName: string;
  fieldName: string;
  canRead: boolean;
  canWrite: boolean;
}

export interface UpdateRolePermissionsVariables {
  roleId: string;
  entityPermissions: EntityPermissionInput[];
  fieldPermissions: FieldPermissionInput[];
}

/** Variables for upsertRoleWithPermissions: create (no roleId) or update (with roleId). */
export interface UpsertRoleWithPermissionsVariables {
  name: string;
  roleId?: string | null;
  description?: string | null;
  entityPermissions?: EntityPermissionInput[];
  fieldPermissions?: FieldPermissionInput[];
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: UpdateRolePermissionsVariables) =>
      executeGraphQL(UPDATE_ROLE_PERMISSIONS_MUTATION, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['userRolesAndPermissions'] });
    },
  });
}

export function useUpsertRoleWithPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: UpsertRoleWithPermissionsVariables) =>
      executeGraphQL(UPSERT_ROLE_WITH_PERMISSIONS_MUTATION, variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['userRolesAndPermissions'] });
      if (variables.roleId) {
        queryClient.invalidateQueries({ queryKey: ['permissions', 'rolePermissions', variables.roleId] });
      }
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) =>
      executeGraphQL<{ deleteRole: boolean }>(DELETE_ROLE_MUTATION, { roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['userRolesAndPermissions'] });
    },
  });
}
