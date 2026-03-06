/**
 * User Roles & Access - Query and mutations for managing user roles
 * Requires user.update permission. Permissions are derived from roles (read-only display).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeGraphQL } from '@/graphql/client';
import { USER_ROLES_AND_PERMISSIONS } from '@/graphql/queries/permissions.queries';
import { GET_ROLES } from '@/graphql/queries/roles.queries';
import {
  ADD_USER_ROLE_MUTATION,
  REMOVE_USER_ROLE_MUTATION,
  UPDATE_USER_ROLES_MUTATION,
} from '@/graphql/mutations/users.mutations';
import { userKeys } from './useUsersQuery';

export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

export interface UserRolesAndPermissions {
  userId: string;
  roles: Role[];
  permissions: { byRole: Record<string, Record<string, unknown>> };
}

function parseByRole(raw: unknown): Record<string, Record<string, unknown>> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, Record<string, unknown>>;
  }
  return {};
}

/**
 * Get user roles and permissions by userId. Requires read permission on user entity.
 */
export function useUserRolesAndPermissions(userId: string) {
  return useQuery({
    queryKey: ['userRolesAndPermissions', userId],
    queryFn: async () => {
      const data = await executeGraphQL<{
        userRolesAndPermissions: UserRolesAndPermissions | null;
      }>(USER_ROLES_AND_PERMISSIONS, { userId });
      const result = data?.userRolesAndPermissions;
      if (!result) return null;
      return {
        ...result,
        permissions: {
          byRole: parseByRole(result.permissions?.byRole ?? {}),
        },
      };
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

interface GetRolesResponse {
  getRoles: Role[];
}

/**
 * Get all roles (getRoles query, no roleId). Requires read permission on role entity.
 * Returns flat array of roles for filtering assigned vs available in UI.
 */
export function useGetAllRoles() {
  return useQuery({
    queryKey: ['getRoles'],
    queryFn: () =>
      executeGraphQL<GetRolesResponse>(GET_ROLES, {}),
    staleTime: 5 * 60 * 1000,
  });
}

/** Get all roles (same as useGetAllRoles). Response has getRoles array. Used by ManageUserAccess. */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => executeGraphQL<GetRolesResponse>(GET_ROLES, {}),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Add role to user (addUserRole). Requires update permission on user entity.
 */
export function useAssignRoleToUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      executeGraphQL(ADD_USER_ROLE_MUTATION, { userId, roleId }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['userRolesAndPermissions', userId] });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

/**
 * Remove role from user (removeUserRole). Requires update permission on user entity.
 */
export function useRemoveRoleFromUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      executeGraphQL(REMOVE_USER_ROLE_MUTATION, { userId, roleId }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['userRolesAndPermissions', userId] });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

/**
 * Replace all roles for a user. Requires update permission on user entity.
 */
export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      executeGraphQL(UPDATE_USER_ROLES_MUTATION, { userId, roleIds }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['userRolesAndPermissions', userId] });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
