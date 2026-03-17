/**
 * Central hook: build list columns from entity registry + permissions.
 * Use in any list page; columns update when permissions change (e.g. after "Refresh permissions").
 */

import { useMemo, type ReactNode } from 'react'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import { getFieldsForEntity } from './entityFields'
import type { FieldType } from './entityFields'
import { Badge } from '@/components/ui/badge'

function cellForType(type: FieldType, value: unknown): ReactNode {
  const empty = '—'
  if (value == null || value === '') return empty
  switch (type) {
    case 'boolean':
      return (
        <Badge variant={(value as boolean) ? 'default' : 'secondary'}>
          {(value as boolean) ? 'Active' : 'Inactive'}
        </Badge>
      )
    case 'date':
      try {
        const d = typeof value === 'string' ? new Date(value) : value as Date
        return isNaN(d.getTime()) ? String(value) : d.toLocaleString()
      } catch {
        return String(value)
      }
    case 'number':
      return typeof value === 'number' ? String(value) : String(value)
    default:
      return String(value)
  }
}

/**
 * Returns columns for the entity list: only fields the user can read (permission-aware).
 * Works with any entity row type; row values are read via index access.
 */
export function useEntityListColumns<T>(
  entity: string
): { header: string; cell: (row: T) => ReactNode }[] {
  const readableFields = useAccessibleFields(entity, 'read')
  const fields = getFieldsForEntity(entity)

  return useMemo(() => {
    const cols: { header: string; cell: (row: T) => ReactNode }[] = []
    for (const field of fields) {
      const isAuditField =
        field.key === 'createdBy' ||
        field.key === 'modifiedBy' ||
        field.key === 'createdAt' ||
        field.key === 'modifiedAt'
      if (!isAuditField && !canShowColumn(readableFields, field.key)) continue
      cols.push({
        header: field.label,
        cell: (row: T) => {
          if (field.key === 'createdBy') {
            const createdByUsername = (row as Record<string, unknown>)['createdByUsername']
            const createdBy = (row as Record<string, unknown>)['createdBy']
            return String(createdByUsername ?? createdBy ?? '—')
          }
          if (field.key === 'modifiedBy') {
            const modifiedByUsername = (row as Record<string, unknown>)['modifiedByUsername']
            const modifiedBy = (row as Record<string, unknown>)['modifiedBy']
            return String(modifiedByUsername ?? modifiedBy ?? '—')
          }
          const value = (row as Record<string, unknown>)[field.key]
          const isCode = field.key === 'code'
          if (isCode && value != null && value !== '') {
            return <span className="font-medium">{String(value)}</span>
          }
          return cellForType(field.type, value) as ReactNode
        },
      })
    }
    return cols
  }, [entity, readableFields, fields])
}
