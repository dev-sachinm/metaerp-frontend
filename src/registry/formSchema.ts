/**
 * Build zod schema and default values from entity field config.
 * Single place for form validation and initial values; driven by registry.
 */

import { z } from 'zod'
import type { FieldConfig } from './entityFields'

export function buildDefaultValues(fields: FieldConfig[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (const f of fields) {
    out[f.key] = f.type === 'boolean' ? (f.optional ? false : false) : ''
  }
  return out
}

export function buildFormSchema(fields: FieldConfig[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of fields) {
    if (f.readOnlyInForm) continue
    const optional = f.optional ?? false
    switch (f.type) {
      case 'boolean':
        shape[f.key] = optional ? z.boolean().optional() : z.boolean()
        break
      case 'number':
        shape[f.key] = optional ? z.coerce.number().optional() : z.coerce.number()
        break
      default:
        shape[f.key] = optional ? z.string().optional() : z.string().min(1, `Please enter ${f.label.toLowerCase()}`)
    }
  }
  return z.object(shape) as z.ZodObject<Record<string, z.ZodTypeAny>>
}
