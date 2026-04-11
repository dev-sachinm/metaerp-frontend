# Entity registry & dynamic fields architecture

Dynamic fields for list/create/edit are driven from a **single source of truth** so that:

- **List columns** and **form fields** are permission-aware and stay in sync with the backend.
- **New entities or fields** are added in one place; list and forms pick them up automatically.
- **No per-page patches**: the same logic applies to all current and future master (and other) entities.

## 1. Central entity field registry

**File:** `src/registry/entityFields.ts`

- **`ENTITY_FIELDS`**: map of entity key → `EntityFieldConfig` (list/create/edit titles, description, and `fields[]`).
- **`FieldConfig`**: `key` (camelCase, must match backend/permissions), `label`, `type` (`text` | `email` | `tel` | `number` | `boolean` | `textarea` | `code` | `date`), `optional`, `placeholder`, `readOnlyInForm`.
- **`getEntityConfig(entity)`** / **`getFieldsForEntity(entity)`**: safe accessors.

**Adding a new entity or field:** extend `ENTITY_FIELDS` in this file. Keys must match backend `entity_permissions.entity_name` (normalized to camelCase in the permission layer).

## 2. Permission layer (unchanged, but used by registry)

**File:** `src/hooks/usePermissions.ts`

- **`useAccessibleFields(entity, 'read' | 'write')`**: returns camelCase field keys the user can read or write (handles backend snake_case via `getFieldPerms`).
- **`canShowColumn(readableFields, fieldKey)`**: whether to show a list column for a field.
- **`getFieldPerms(fields, fieldName)`**: resolve read/write per field (camelCase or snake_case); used by the form renderer.

List and forms both use these; no duplicate permission logic per page.

## 3. Generic list columns

**File:** `src/registry/useEntityListColumns.tsx`

- **`useEntityListColumns<T>(entity)`**: returns `{ header, cell }[]` for the entity.
- Columns are built from **registry fields** filtered by **`useAccessibleFields(entity, 'read')`** and **`canShowColumn`**.
- Cell renderer is chosen by **`FieldConfig.type`** (text, date, boolean badge, etc.).

**Usage:** In any list page (e.g. `CustomersList`), call `useEntityListColumns<Customer>(ENTITY)` and pass the result to `MasterDataListPage` as `columns`. Titles come from `getEntityConfig(ENTITY)`.

## 4. Generic form fields

**Files:**  
`src/registry/useEntityFormFields.ts`, `src/registry/EntityFormFields.tsx`, `src/registry/formSchema.ts`

- **`useEntityFormFields(entity, 'create' | 'edit')`**: returns `FieldConfig[]` for the form, filtered by **`useAccessibleFields(entity, 'write')`** (create) or **`'read'`** (edit).
- **`buildFormSchema(fields)`**: zod schema for validation (required/optional, types); skips `readOnlyInForm` for validation.
- **`buildDefaultValues(fields)`**: initial values for the form.
- **`<EntityFormFields entity mode control />`**: renders one form section: for each field in `useEntityFormFields`, wraps with **`FieldGuard`** and renders the right input (Input, Switch, etc.) from **`FieldConfig.type`**. Edit mode uses **`getFieldPerms`** to disable inputs when the user has no write permission.

**Usage:** In Create/Edit pages, use `useEntityFormFields(ENTITY, 'create'|'edit')`, `buildFormSchema(formFields)`, `buildDefaultValues(formFields)` for `useForm`, and render **`<EntityFormFields entity={ENTITY} mode="create"|"edit" control={form.control} />`**. Submit payload: build an object from form values for fields that are not `readOnlyInForm` and pass to the existing mutation (e.g. cast to `CustomerInput`).

## 5. Applying this to other entities

To make another master entity (e.g. Product, Supplier) use the same pattern:

1. **Registry:** Ensure the entity and all its fields exist in **`ENTITY_FIELDS`** in `src/registry/entityFields.ts` (field keys camelCase, matching backend).
2. **List:** In the list page, use **`useEntityListColumns<YourType>(ENTITY)`** and **`getEntityConfig(ENTITY)`** for title/description; keep existing `useXxxList`, `useDeleteXxx`, and routing.
3. **Create/Edit:** Use **`useEntityFormFields(ENTITY, 'create'|'edit')`**, **`buildFormSchema`**, **`buildDefaultValues`**, and **`<EntityFormFields entity={ENTITY} mode={...} control={form.control} />`**; keep existing `useCreateXxx` / `useUpdateXxx` / `useXxx(id)` and map form values to the mutation input type.

No new permission logic per entity: **dynamic fields work for each CRUD operation of all current and future models automatically** as long as the entity and fields are in the registry and the backend returns permissions with the same entity/field names (camelCase or snake_case; the permission layer normalizes).
