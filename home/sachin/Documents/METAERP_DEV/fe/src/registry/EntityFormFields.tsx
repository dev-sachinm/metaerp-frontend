/**
 * Renders form fields from registry + permissions (create or edit).
 * Use in Create/Edit pages; only fields the user can access are shown.
 */

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FieldGuard } from '@/components/FieldGuard'
import { usePermissions } from '@/stores/authStore'
import { getFieldPerms } from '@/hooks/usePermissions'
import { useEntityFormFields } from './useEntityFormFields'
import type { FieldConfig, FieldType } from './entityFields'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

function renderInput(
  fieldConfig: FieldConfig,
  value: unknown,
  onChange: (v: unknown) => void,
  canEdit: boolean
) {
  const { key, type, placeholder, label } = fieldConfig
  const disabled = !canEdit || fieldConfig.readOnlyInForm
  const common = { disabled, className: disabled ? 'bg-muted' : undefined }

  switch (type) {
    case 'boolean':
      return (
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(v) => onChange(v)}
          disabled={disabled}
        />
      )
    case 'textarea':
      return (
        <Input
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[80px]"
        />
      )
    case 'email':
      return (
        <Input
          type="email"
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )
    case 'tel':
      return (
        <Input
          type="tel"
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={placeholder}
        />
      )
    case 'date':
      return (
        <Input
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )
    default:
      return (
        <Input
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? label}
        />
      )
  }
}

interface EntityFormFieldsProps<T extends FieldValues> {
  entity: string
  mode: 'create' | 'edit'
  control: Control<T>
}

/**
 * Renders all form fields for the entity that the user has permission to see.
 * Create: action="write". Edit: action="read", input disabled when no write.
 */
export function EntityFormFields<T extends FieldValues>({
  entity,
  mode,
  control,
}: EntityFormFieldsProps<T>) {
  const permissions = usePermissions()
  const fields = useEntityFormFields(entity, mode)
  const action = mode === 'create' ? 'write' : 'read'
  const entityFields = permissions?.entities?.[entity]?.fields

  return (
    <section className="space-y-4">
      {fields.map((fieldConfig) => {
        const canEdit =
          mode === 'create'
            ? true
            : (getFieldPerms(entityFields, fieldConfig.key)?.write === true && !fieldConfig.readOnlyInForm)

        return (
          <FieldGuard
            key={fieldConfig.key}
            entity={entity}
            fieldName={fieldConfig.key}
            action={action}
          >
            <FormField
              control={control}
              name={fieldConfig.key as FieldPath<T>}
              render={({ field }) => (
                <FormItem>
                  {fieldConfig.type === 'boolean' ? (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <FormLabel>{fieldConfig.label}</FormLabel>
                        {entity === 'customer' && fieldConfig.key === 'isActive' && (
                          <p className="text-xs text-slate-500">
                            Inactive customers are hidden from most selections.
                          </p>
                        )}
                      </div>
                      <FormControl>
                        {renderInput(fieldConfig, field.value, field.onChange, canEdit)}
                      </FormControl>
                    </div>
                  ) : (
                    <>
                      <FormLabel>{fieldConfig.label}</FormLabel>
                      <FormControl>
                        {renderInput(fieldConfig, field.value, field.onChange, canEdit)}
                      </FormControl>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGuard>
        )
      })}
    </section>
  )
}
