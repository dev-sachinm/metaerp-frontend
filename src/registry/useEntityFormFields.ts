/**
 * Central hook: form fields for create/edit from entity registry + permissions.
 * - Create: only fields with write permission.
 * - Edit: fields the user can read OR write (write implies read in forms).
 *   If no field permissions configured for the entity, all registry fields are shown.
 */

import { useMemo } from 'react'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import { getFieldsForEntity } from './entityFields'
import type { FieldConfig } from './entityFields'

export function useEntityFormFields(
  entity: string,
  mode: 'create' | 'edit'
): FieldConfig[] {
  // For edit: use 'read' access which already includes fields with write=true in getAccessibleFieldKeys.
  // null return from useAccessibleFields means no field perms configured → canShowColumn(null) returns true for all.
  const accessType = mode === 'create' ? 'write' : 'read'
  const accessibleFields = useAccessibleFields(entity, accessType)
  const allFields = getFieldsForEntity(entity)

  return useMemo(() => {
    const result = allFields.filter((f) => canShowColumn(accessibleFields, f.key))
    if (import.meta.env.DEV) {
      console.debug(`[useEntityFormFields] entity=${entity} mode=${mode}`, {
        accessibleFields,
        allFieldKeys: allFields.map(f => f.key),
        visibleFieldKeys: result.map(f => f.key),
      })
    }
    return result
  }, [entity, accessType, accessibleFields, allFields])
}
