/**
 * Auth Mutation Hooks - React Query mutations for authentication
 * Login returns user (id, email, isActive) and permissions.byRole; roles derived from byRole keys.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeGraphQL } from '@/graphql/client';
import { LOGIN_MUTATION, REFRESH_TOKEN_MUTATION } from '@/graphql/mutations/auth.mutations';
import { useAuthStore } from '@/stores/authStore';
import { mergeByRoleToEntities, getRoleNamesFromByRole } from '@/lib/permissions';
import type { PermissionsByRole } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/graphqlErrors';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Type definitions
interface LoginVariables {
  username: string;
  password: string;
}

interface LoginResponse {
  login: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    user: {
      id: string;
      username: string | null;
      email: string | null;
      isActive: boolean;
    };
    permissions: {
      byRole: PermissionsByRole;
    };
  };
}

interface RefreshVariables {
  refreshToken: string;
}

interface RefreshResponse {
  refresh: {
    accessToken: string;
    tokenType: string;
  };
}

/**
 * Login mutation hook
 * Authenticates user and updates auth store
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
  const setPermissions = useAuthStore((state) => state.setPermissions);

  return useMutation({
    mutationFn: (variables: LoginVariables) =>
      executeGraphQL<LoginResponse>(LOGIN_MUTATION, variables),
    onSuccess: (data) => {
      const { user: loginUser, permissions: loginPerms } = data.login;
      // Permissions from login (byRole) → merge to entities and set so guards work immediately
      const permissionsResponse = mergeByRoleToEntities(loginPerms?.byRole);
      setPermissions(permissionsResponse);
      // Roles are the keys of permissions.byRole (login user has no roles field)
      const roles = getRoleNamesFromByRole(loginPerms?.byRole);
      setUser({
        id: loginUser.id,
        email: loginUser.email ?? loginUser.username ?? '',
        username: loginUser.username ?? undefined,
        is_active: loginUser.isActive ?? true,
        roles,
      });
      setAccessToken(data.login.accessToken);
      setRefreshToken(data.login.refreshToken);

      queryClient.invalidateQueries();
      toast.success('Login successful!');
    },
    onError: (error: any) => {
      const rawMessage = error.response?.errors?.[0]?.message || '';
      // Check for backend database errors
      if (rawMessage.includes('UniqueViolation') || rawMessage.includes('duplicate key')) {
        toast.error('Server error: Database issue. Please try again or contact support.');
        logger.error('Backend database error during login', {
          category: 'technical',
          data: { rawMessage },
          error,
        });
      } else {
        toast.error(getErrorMessage(error, 'Login failed'));
        logger.error('Login mutation failed', {
          category: 'technical',
          error,
        });
      }
    },
  });
}

/**
 * Refresh token mutation hook
 * Gets new access token using refresh token
 * Called automatically by graphql client on 401 errors
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: (variables: RefreshVariables) =>
      executeGraphQL<RefreshResponse>(REFRESH_TOKEN_MUTATION, variables),
    onSuccess: (data) => {
      // Update only the access token in store
      useAuthStore.getState().setAccessToken(data.refresh.accessToken);
    },
    onError: () => {
      // Refresh failed, logout user
      useAuthStore.getState().logout();
      toast.error('Session expired. Please log in again.');
    },
  });
}
