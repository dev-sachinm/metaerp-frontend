/**
 * Permission Query Hooks - React Query hooks for permission operations
 */

import { useQuery } from '@tanstack/react-query';
import { executeGraphQL } from '@/graphql/client';
import { GET_MY_PERMISSIONS, GET_ENTITY_PERMISSIONS, GET_FIELD_PERMISSIONS, GET_ROLE_PERMISSIONS, GET_ENUM_ENTITIES, GET_ENUM_FIELDS } from '@/graphql/queries/permissions.queries';
import { useAuthStore } from '@/stores/authStore';
import type { PermissionsByRole } from '@/lib/permissions';

// Type definitions
export interface EntityPermission {
  id: string;
  entityName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface FieldPermission {
  id: string;
  entityName: string;
  fieldName: string;
  canRead: boolean;
  canWrite: boolean;
}

/** myPermissions query returns permissions grouped by role (same as login.permissions) */
export interface MyPermissions {
  byRole: PermissionsByRole;
}

/**
 * Query keys factory
 */
export const permissionKeys = {
  all: ['permissions'] as const,
  my: () => [...permissionKeys.all, 'my'] as const,
  entities: () => [...permissionKeys.all, 'entities'] as const,
  entityList: (roleId: string, skip: number, limit: number) => [...permissionKeys.entities(), roleId, skip, limit] as const,
  fields: () => [...permissionKeys.all, 'fields'] as const,
  fieldList: (roleId: string, skip: number, limit: number) => [...permissionKeys.fields(), roleId, skip, limit] as const,
  rolePermissions: (roleId: string) => [...permissionKeys.all, 'rolePermissions', roleId] as const,
  enumEntities: () => [...permissionKeys.all, 'enumEntities'] as const,
  enumFields: (entityId: string) => [...permissionKeys.all, 'enumFields', entityId] as const,
};

/**
 * Get current user's complete permission structure
 * This is the main hook for permission checks
 */
export function useMyPermissions() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: [...permissionKeys.my(), token], // Include token in key so query re-runs when token changes
    queryFn: async () => {
      const result = await executeGraphQL<{ myPermissions: MyPermissions }>(GET_MY_PERMISSIONS);
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes — so new role/field permissions appear after refetch or window focus
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    enabled: !!token, // Only fetch if we have a token
  });
}

/**
 * Get entity-level permissions for a specific role (paginated). Admin only.
 * Per BACKEND_IMPLEMENTATION_STATE.md: entityPermissions(roleId, skip, limit).
 */
export function useEntityPermissionsForRole(roleId: string, skip: number = 0, limit: number = 50) {
  return useQuery({
    queryKey: permissionKeys.entityList(roleId, skip, limit),
    queryFn: () =>
      executeGraphQL<{ entityPermissions: { items: EntityPermission[]; total: number; hasMore: boolean } }>(
        GET_ENTITY_PERMISSIONS,
        { roleId, skip, limit }
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!roleId,
  });
}

/**
 * Get field-level permissions for a specific role (paginated). Admin only.
 * Per BACKEND_IMPLEMENTATION_STATE.md: fieldPermissions(roleId, skip, limit).
 */
export function useFieldPermissionsForRole(roleId: string, skip: number = 0, limit: number = 100) {
  return useQuery({
    queryKey: permissionKeys.fieldList(roleId, skip, limit),
    queryFn: () =>
      executeGraphQL<{ fieldPermissions: { items: FieldPermission[]; total: number; hasMore: boolean } }>(
        GET_FIELD_PERMISSIONS,
        { roleId, skip, limit }
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!roleId,
  });
}

export interface RoleWithPermissions {
  role: { id: string; name: string; description?: string | null };
  entityPermissions: EntityPermission[];
  fieldPermissions: FieldPermission[];
}

/**
 * Get role with all entity and field permissions in one query.
 * Per BACKEND_IMPLEMENTATION_STATE.md: getRolePermissions(roleId).
 */
export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: permissionKeys.rolePermissions(roleId),
    queryFn: () =>
      executeGraphQL<{ getRolePermissions: RoleWithPermissions | null }>(GET_ROLE_PERMISSIONS, { roleId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!roleId,
  });
}

/** Entity enum item: key (e.g. entity_permissions.entity_name), displayName for UI */
export interface EntityEnumItem {
  key: string;
  displayName: string;
}

/** Field enum item: key (e.g. field_permissions.field_name), displayName for UI */
export interface FieldEnumItem {
  key: string;
  displayName: string;
}

/**
 * All permission-managed entities from backend enum (key + displayName).
 * Per BACKEND_IMPLEMENTATION_STATE.md: getEnumEntities returns [EntityEnumItem!]!
 */
export function useEnumEntities() {
  return useQuery({
    queryKey: permissionKeys.enumEntities(),
    queryFn: () => executeGraphQL<{ getEnumEntities: EntityEnumItem[] }>(GET_ENUM_ENTITIES),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fields for a given entity from backend enum (key + displayName).
 * Per BACKEND_IMPLEMENTATION_STATE.md: getEnumFields(entityId) returns [FieldEnumItem!]!
 */
export function useEnumFields(entityId: string) {
  return useQuery({
    queryKey: permissionKeys.enumFields(entityId),
    queryFn: () => executeGraphQL<{ getEnumFields: FieldEnumItem[] }>(GET_ENUM_FIELDS, { entityId }),
    staleTime: 10 * 60 * 1000,
    enabled: !!entityId,
  });
}

