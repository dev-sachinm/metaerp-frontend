import { describe, it, expect } from 'vitest'
import {
  mergeByRoleToEntities,
  getRoleNamesFromByRole,
  type PermissionsByRole,
} from './permissions'

describe('permissions', () => {
  describe('mergeByRoleToEntities', () => {
    it('returns empty entities for null or undefined byRole', () => {
      expect(mergeByRoleToEntities(null)).toEqual({ entities: {} })
      expect(mergeByRoleToEntities(undefined)).toEqual({ entities: {} })
    })

    it('returns empty entities for non-object byRole', () => {
      expect(mergeByRoleToEntities(1 as unknown as PermissionsByRole)).toEqual({
        entities: {},
      })
    })

    it('merges single role permissions into entities', () => {
      const byRole: PermissionsByRole = {
        Admin: {
          Customer: {
            create: true,
            read: true,
            update: true,
            delete: true,
            fields: {
              name: { read: true, write: true },
              email: { read: true, write: false },
            },
          },
        },
      }
      const result = mergeByRoleToEntities(byRole)
      expect(result.entities.Customer).toEqual({
        create: true,
        read: true,
        update: true,
        delete: true,
        list: true,
        fields: {
          name: { read: true, write: true },
          email: { read: true, write: false },
        },
      })
    })

    it('ORs permissions across multiple roles', () => {
      const byRole: PermissionsByRole = {
        Viewer: {
          Customer: { read: true, create: false, update: false, delete: false },
        },
        Editor: {
          Customer: { read: true, create: true, update: true, delete: false },
        },
      }
      const result = mergeByRoleToEntities(byRole)
      expect(result.entities.Customer).toMatchObject({
        create: true,
        read: true,
        update: true,
        delete: false,
        list: true,
      })
    })

    it('merges field permissions across roles', () => {
      const byRole: PermissionsByRole = {
        Role1: {
          Customer: {
            read: true,
            fields: { name: { read: true, write: false } },
          },
        },
        Role2: {
          Customer: {
            read: true,
            fields: { name: { read: true, write: true } },
          },
        },
      }
      const result = mergeByRoleToEntities(byRole)
      expect(result.entities.Customer?.fields?.name).toEqual({
        read: true,
        write: true,
      })
    })

    it('skips invalid role or entity entries', () => {
      const byRole = {
        Admin: { Customer: { read: true } },
        Bad: null,
        AlsoBad: 1,
      } as unknown as PermissionsByRole
      const result = mergeByRoleToEntities(byRole)
      expect(result.entities.Customer).toBeDefined()
      expect(Object.keys(result.entities)).toEqual(['Customer'])
    })
  })

  describe('getRoleNamesFromByRole', () => {
    it('returns empty array for null or undefined', () => {
      expect(getRoleNamesFromByRole(null)).toEqual([])
      expect(getRoleNamesFromByRole(undefined)).toEqual([])
    })

    it('returns empty array for non-object', () => {
      expect(getRoleNamesFromByRole(1 as unknown as PermissionsByRole)).toEqual(
        []
      )
    })

    it('returns keys of byRole as role names', () => {
      expect(
        getRoleNamesFromByRole({
          Admin: {},
          Viewer: {},
        })
      ).toEqual(['Admin', 'Viewer'])
    })
  })
})
