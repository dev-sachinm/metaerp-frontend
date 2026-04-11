/**
 * User Query Hooks - React Query hooks for user operations
 * Implements hybrid pagination strategy with automatic batch fetching
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { executeGraphQL } from '@/graphql/client';
import { GET_USERS, GET_USER, GET_CURRENT_USER } from '@/graphql/queries/users.queries';
import {
  CREATE_USER_MUTATION,
  UPDATE_USER_MUTATION,
  DELETE_USER_MUTATION,
  CHANGE_PASSWORD_MUTATION,
  SET_USER_PASSWORD_MUTATION,
} from '@/graphql/mutations/users.mutations';
import { useAuthStore } from '@/stores/authStore';

// Type definitions (aligned with BACKEND_IMPLEMENTATION_STATE.md UserType)
export interface UserRole {
  id: string;
  name: string;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  mobileNumber?: string | null;
  username?: string;
  email: string;
  isActive: boolean;
  roles: UserRole[];
}

export interface PaginatedUsers {
  users: {
    items: User[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
    firstPage: number;
    lastPage: number;
  };
}

export interface GetUsersVariables {
  page: number;
  pageSize: number;
  roleId?: string | null;
}

/**
 * Query keys factory - centralized key management
 * Enables efficient cache invalidation and updates
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: Partial<GetUsersVariables>) => [...userKeys.lists(), params ?? {}] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  current: () => [...userKeys.all, 'current'] as const,
};

/**
 * Standard paginated users query
 * Use for simple pagination scenarios
 * 
 * @param skip - Number of records to skip
 * @param limit - Number of records to fetch
 */
export function useUsers(page: number = 1, pageSize: number = 20, roleId?: string | null) {
  return useQuery({
    queryKey: userKeys.list({ page, pageSize, roleId }),
    queryFn: () => executeGraphQL<PaginatedUsers>(GET_USERS, {
      page,
      pageSize,
      ...(roleId ? { roleId } : {}),
    }),
    staleTime: Number(import.meta.env.VITE_CACHE_STALE_TIME) || 5 * 60 * 1000,
    gcTime: Number(import.meta.env.VITE_CACHE_GC_TIME) || 10 * 60 * 1000,
  });
}

/** @deprecated Use useUsers with page/pageSize instead */
export function useInfiniteUsers(_pageSize?: number) {
  return useInfiniteQuery({
    queryKey: userKeys.lists(),
    queryFn: ({ pageParam = 1 }) =>
      executeGraphQL<PaginatedUsers>(GET_USERS, { page: pageParam, pageSize: 200 }),
    getNextPageParam: (lastPage) => {
      const { hasMore, page, totalPages } = lastPage.users;
      return hasMore && page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: Number(import.meta.env.VITE_CACHE_STALE_TIME) || 5 * 60 * 1000,
    gcTime: Number(import.meta.env.VITE_CACHE_GC_TIME) || 10 * 60 * 1000,
  });
}

/**
 * Get single user by ID
 * 
 * @param id - User ID
 * @param options - Additional query options
 */
export function useUser(id: string, options?: Partial<UseQueryOptions<{ user: User }>>) {
  return useQuery<{ user: User }>({
    queryKey: userKeys.detail(id),
    queryFn: () => executeGraphQL<{ user: User }>(GET_USER, { userId: id }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Get current authenticated user
 * Useful for profile display, permission checks
 */
export function useCurrentUser() {
  const token = useAuthStore((state) => state.accessToken);
  
  return useQuery({
    queryKey: [...userKeys.current(), token], // Include token in key so query re-runs when token changes
    queryFn: () => executeGraphQL<{ currentUser: User }>(GET_CURRENT_USER),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    enabled: !!token, // Only fetch if we have a token
  });
}

/** createUser variables; dateOfBirth, mobileNumber, email are optional. */
export interface CreateUserVariables {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  dateOfBirth?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
}

/**
 * Create user mutation (createUser). Backend: required firstName, lastName, username, password;
 * optional dateOfBirth (Date), mobileNumber (String), email (String). Only send optional args when provided.
 * Invalidates user list cache on success.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: CreateUserVariables) => {
      const dateOfBirth = variables.dateOfBirth?.trim();
      const mobileNumber = variables.mobileNumber?.trim();
      const email = variables.email?.trim();
      return executeGraphQL<{ createUser: User }>(CREATE_USER_MUTATION, {
        firstName: variables.firstName.trim(),
        lastName: variables.lastName.trim(),
        username: variables.username.trim(),
        password: variables.password,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        ...(mobileNumber ? { mobileNumber } : {}),
        ...(email ? { email } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/** updateUser variables; all except userId are optional. Username and password cannot be changed. */
export interface UpdateUserVariables {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  isActive?: boolean | null;
}

/**
 * Update user mutation (updateUser). Requires update permission on user entity.
 * Invalidates user list and detail cache on success.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: UpdateUserVariables) => {
      const payload: Record<string, unknown> = { userId: variables.userId };
      if (variables.firstName !== undefined) payload.firstName = variables.firstName?.trim() ?? null;
      if (variables.lastName !== undefined) payload.lastName = variables.lastName?.trim() ?? null;
      if (variables.dateOfBirth !== undefined) payload.dateOfBirth = variables.dateOfBirth?.trim() || null;
      if (variables.mobileNumber !== undefined) payload.mobileNumber = variables.mobileNumber?.trim() || null;
      if (variables.email !== undefined) payload.email = variables.email?.trim() || null;
      if (variables.isActive !== undefined) payload.isActive = variables.isActive;
      return executeGraphQL<{ updateUser: User }>(UPDATE_USER_MUTATION, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
    },
  });
}

/**
 * Delete user mutation (deleteUser). Requires delete permission on user entity.
 * Invalidates user list cache on success.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      executeGraphQL<{ deleteUser: boolean }>(DELETE_USER_MUTATION, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Change current user's password. Requires authentication.
 * currentPassword + newPassword (min 6 chars).
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (variables: { currentPassword: string; newPassword: string }) =>
      executeGraphQL<{ changePassword: boolean }>(CHANGE_PASSWORD_MUTATION, variables),
  });
}

/**
 * Set another user's password (admin). Requires update permission on user entity.
 * newPassword min 6 characters.
 */
export function useSetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { userId: string; newPassword: string }) =>
      executeGraphQL<{ setUserPassword: boolean }>(SET_USER_PASSWORD_MUTATION, variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
    },
  });
}
