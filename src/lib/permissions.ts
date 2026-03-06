/**
 * Permission utilities — align with BACKEND_IMPLEMENTATION_STATE.md (permissions by role).
 * Converts API shape (byRole) to the store shape (entities) used by guards.
 */

import type { PermissionsResponse, EntityPermissions, FieldPermissions } from '@/types/auth';

/**
 * API shape: permissions keyed by role, then by entity.
 * Each entity has create, read, update, delete, and fields (fieldName → { read, write }).
 */
export type PermissionsByRole = Record<
  string,
  Record<
    string,
    {
      create?: boolean;
      read?: boolean;
      update?: boolean;
      delete?: boolean;
      fields?: Record<string, { read?: boolean; write?: boolean }>;
    }
  >
>;

/**
 * Merge permissions from all roles with OR logic.
 * If any role grants create/read/update/delete or field read/write, the effective permission is true.
 * Used for both login.permissions.byRole and myPermissions.byRole.
 */
export function mergeByRoleToEntities(byRole: PermissionsByRole | null | undefined): PermissionsResponse {
  const entities: Record<string, EntityPermissions> = {};

  if (!byRole || typeof byRole !== 'object') {
    return { entities };
  }

  for (const rolePerms of Object.values(byRole)) {
    if (!rolePerms || typeof rolePerms !== 'object') continue;
    for (const [entityName, perms] of Object.entries(rolePerms)) {
      if (!perms || typeof perms !== 'object') continue;
      const existing = entities[entityName];
      const create = (existing?.create ?? false) || !!perms.create;
      const read = (existing?.read ?? false) || !!perms.read;
      const update = (existing?.update ?? false) || !!perms.update;
      const delete_ = (existing?.delete ?? false) || !!perms.delete;
      const fields: Record<string, FieldPermissions> = { ...existing?.fields };
      if (perms.fields && typeof perms.fields === 'object') {
        for (const [fieldName, f] of Object.entries(perms.fields)) {
          if (!f || typeof f !== 'object') continue;
          const prev = fields[fieldName];
          fields[fieldName] = {
            read: (prev?.read ?? false) || !!f.read,
            write: (prev?.write ?? false) || !!f.write,
          };
        }
      }
      entities[entityName] = {
        create,
        read,
        update,
        delete: delete_,
        list: true,
        fields,
      };
    }
  }

  return { entities };
}

/**
 * Get role names from permissions.byRole (e.g. for display).
 * Login response has no user.roles; roles are the keys of permissions.byRole.
 */
export function getRoleNamesFromByRole(byRole: PermissionsByRole | null | undefined): string[] {
  if (!byRole || typeof byRole !== 'object') return [];
  return Object.keys(byRole);
}
