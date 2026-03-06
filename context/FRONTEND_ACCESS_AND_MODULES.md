# Frontend Access Control & Modular Architecture

**Purpose:** Single source of truth for **permitted entities/fields** and **enabled modules**. All UI (menus, routes, tables, forms) uses this central control so behaviour is consistent and maintainable.

**Related:** [BACKEND_IMPLEMENTATION_STATE.md](./BACKEND_IMPLEMENTATION_STATE.md), [FRONTEND_MODULAR_ADOPTION.md](./FRONTEND_MODULAR_ADOPTION.md).

---

## 1. Two layers of control

| Layer | What it controls | Source of truth | Effect when not allowed |
|-------|------------------|-----------------|-------------------------|
| **Modules** | Which feature areas exist for the tenant (e.g. core, master_data) | Backend `enabledModules` query → frontend store | Menus/links/routes for that module are **removed** or blocked. No UI entry point. |
| **Permissions** | What the user can do within a module (entities: create/read/update/delete; fields: read/write) | Backend `myPermissions` / login → merged by role → auth store | Menus/links/buttons/columns/inputs are **hidden or disabled** per entity/field. |

**Order of application:**  
1. **Module enabled?** If not → hide/block entire module (menus, routes, API calls).  
2. **Permission granted?** If not → hide/disable that entity or field within the module.

So: **Module = “is this feature area available for this tenant?”**  
**Permission = “can this user do this action / see this field?”**

---

## 2. Permitted entities and fields (central point of control)

### 2.1 Single source of truth

- **Backend:** Sends permissions in login / `myPermissions` as `byRole` (role → entity → create/read/update/delete/list + fields → field → read/write).
- **Frontend:** `src/lib/permissions.ts` merges `byRole` into a single `entities` map (per entity, per field). This merged shape is stored in **auth store** (`permissions`) and is the **only** place the UI should read from for “can user do X on entity/field?”.

### 2.2 How to access (standard pattern)

All UI must use these; no ad‑hoc permission checks.

| Need | Hook / API | Use for |
|------|------------|--------|
| Can user do action on entity? | `useCanAccess(entity, 'create' \| 'read' \| 'update' \| 'delete')` | Buttons, route guards, menu visibility |
| Multiple actions at once | `useEntityActions(entity)` → `canCreate`, `canRead`, `canUpdate`, `canDelete`, `canList` | List page (create button, row actions), detail page |
| Has user any access to entity? | `useHasEntityAccess(entity)` | Show/hide menu item or section |
| List of entities user can access | `useAccessibleEntities()` | Dynamic nav, dashboards |
| Can user read/write a field? | `useCanReadField(entity, field)`, `useCanEditField(entity, field)` | Table columns, form fields |
| Field access level (read/write/readonly/hidden) | `useFieldAccess(entity, field)` | Form: show, disable, or hide field |
| List of readable/writable fields | `useAccessibleFields(entity, 'read' \| 'write')` | Building table columns or form schema from permissions |

**Route guard:** `ProtectedRoute entity="user" action="create"` (or `read`/`update`/`delete`) ensures the route is only rendered if the user has that permission.

**Result:** One central place (auth store + merged permissions) and one set of hooks; menus, routes, tables, and forms all use the same rules.

### 2.3 Entity → UI mapping (navigation config)

To avoid scattering path/label logic, we use a **central nav/entity config** (`src/config/navigation.ts` or similar):

- Defines **all** known modules and their nav items: e.g. `{ moduleId, entity?, path, label, icon? }`.
- **Entities** in this config are the same names as in permissions (e.g. `user`, `role`).
- At runtime:
  1. Filter nav items by **enabled modules** (see §3).
  2. For items that have an `entity`, filter by **permission** (`useHasEntityAccess(entity)` or `useEntityActions(entity).canList`).
- Same config can drive route registration (which routes belong to which module) for `RequireModule` guards.

This gives a **standard architecture**: one config for “what exists in the app”, then filter by module then by permission.

---

## 3. Enabled modules (enable/disable per tenant)

### 3.1 Single source of truth

- **Backend:** `enabledModules` query returns `{ moduleId, enabled, displayName, description }[]` for the tenant (from `X-Tenant-ID`).
- **Frontend:** Call `enabledModules` at app load (after auth) and when tenant changes; store result in **modules store** (e.g. Zustand). Derive `enabledModuleIds: string[]` (where `enabled === true`).

### 3.2 How to use

| Need | Hook / API | Use for |
|------|------------|--------|
| Is module enabled? | `useIsModuleEnabled(moduleId)` | Conditional rendering, guards |
| List of enabled module IDs | `useEnabledModuleIds()` or `useModulesStore()` | Building nav, route guards |
| Full list (for labels) | `useEnabledModules()` | Nav labels, “Module not enabled” message |

### 3.3 Navigation

- Build sidebar/menus from the **central nav config** (see §2.3):
  - Keep only items whose `moduleId` is in `enabledModuleIds`.
  - Then, for items with an `entity`, keep only if user has access (`useHasEntityAccess(entity)`).
- So: **first filter by module, then by permission.**

### 3.4 Route guards

- For any route that belongs to a module (e.g. `/users`, `/roles` → `core`; `/master/*` → `master_data`):
  - Wrap in `<RequireModule moduleId="core">` (or the right module).
  - If module is not enabled → redirect to a “Module not enabled” page or home, and do not render the page.

### 3.5 GraphQL

- Send **`X-Tenant-ID`** on every GraphQL request (from env or future tenant context) so backend returns correct data and enabled modules.
- In global error handler: if the backend returns “Module 'x' is not enabled”, show a clear message and optionally refresh enabled modules or redirect.

---

## 4. Summary

- **Permitted entities/fields:** Auth store holds merged permissions; all UI uses `useCanAccess`, `useEntityActions`, `useAccessibleFields`, `useFieldAccess`, etc. No duplicate permission logic.
- **Central UI mapping:** One nav/entity config maps (moduleId, entity, path, label) and optionally which routes belong to which module; menus and route guards are derived from this + enabled modules + permissions.
- **Modules:** enabledModules → modules store → `enabledModuleIds`; nav and routes first filter by module, then by permission. `RequireModule` and “module not enabled” error handling complete the picture.

This matches how real-world apps centralize access control and feature flags and keeps the frontend aligned with the backend’s modular and permission-aware design.
