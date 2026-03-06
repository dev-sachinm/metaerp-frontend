# METAERP Frontend — Gap Analysis

This document lists gaps between the current frontend implementation and **BACKEND_IMPLEMENTATION_STATE.md** (source of truth for GraphQL API, user roles, entity permissions, and field-level permissions). Re-scanned after permission query/hook fixes.

---

## ✅ FIXED (since last scan)

### Permission APIs (entityPermissions / fieldPermissions)

- **Queries:** `src/graphql/queries/permissions.queries.ts` now passes **`$roleId: String!`** to both `entityPermissions(roleId: $roleId, skip: $skip, limit: $limit)` and `fieldPermissions(roleId: $roleId, skip: $skip, limit: $limit)`.
- **Hooks:** `src/hooks/graphql/usePermissionsQuery.ts` exposes **`useEntityPermissionsForRole(roleId, skip?, limit?)`** and **`useFieldPermissionsForRole(roleId, skip?, limit?)`** with `enabled: !!roleId`. Query keys include `roleId`. Old role-agnostic hooks removed.

---

## 1. Token refresh on 401 (UNAUTHENTICATED)

**Source:** BACKEND_IMPLEMENTATION_STATE.md — On expired token, call `refresh(refreshToken)` then retry the request; only logout if refresh fails.

**Current:** `src/graphql/client.ts` has `const refreshed = false` and a TODO. On 401 we always logout and never attempt refresh.

**Action:**

- Implement refresh in the client: on `UNAUTHENTICATED` (or 401), call the `refresh` mutation with the stored refresh token (from login response; store in memory or secure storage per doc). On success, update the access token in the auth store and retry the original request once. On failure, logout and redirect to login.
- Ensure the refresh token is stored at login (e.g. in memory or as per BACKEND_IMPLEMENTATION_STATE.md) and available when the client needs to refresh.

---

## 2. Permissions loaded after login (race)

**Source:** BACKEND_IMPLEMENTATION_STATE.md — Use `myPermissions` to drive entity/field checks; check permissions before rendering UI.

**Current:** Login sets `setPermissions(null)`. Permissions are loaded asynchronously by `useAuth()` via `useMyPermissions()` after redirect. For a short period after login, `permissions` in the store is `null` and any permission guard or field check will deny access.

**Action:**

- Either:
  - **Option A:** In `PermissionGuard` / `FieldGuard`, if `permissions === null` and user is set, show a loading state instead of fallback.
  - **Option B:** After login success, await `myPermissions` (e.g. refetch permissions query), set the result in the store, then navigate.

---

## 3. Users list: columns not filtered by field-level permissions

**Source:** BACKEND_IMPLEMENTATION_STATE.md — Field-level permissions control which fields can be read; hide columns for fields the user cannot read.

**Current:** `src/pages/users/UsersList.tsx` uses `useAccessibleFields('user', 'read')` for debug badges but **does not filter table columns** by them. All columns (id, email, roles, isActive) are always shown.

**Action:**

- Build table columns dynamically from `useAccessibleFields('user', 'read')`, mapping backend field names (e.g. `id`, `email`, `is_active`, `roles`) to columns. Only add a column if the field is in the readable set. Align column keys with `myPermissions.entities.user.fields` (e.g. `is_active` if that’s what the API uses).

---

## 4. /users route not protected by entity permission

**Source:** BACKEND_IMPLEMENTATION_STATE.md — Entity-level permissions should control access to screens.

**Current:** In `src/App.tsx`, the `/users` route is only gated by “user exists” (logged in). It is not wrapped in `ProtectedRoute` with `entity="user"` and `action="list"`.

**Action:**

- Wrap the `/users` route in `ProtectedRoute` with `entity="user"` and `action="list"`. Redirect or show unauthorized when the user lacks that permission.

---

## 5. Entity/field name casing (backend alignment)

**Source:** BACKEND_IMPLEMENTATION_STATE.md — Example `myPermissions` uses field names like `"is_active"`, `"hashed_password"` (snake_case).

**Current:** Ensure everywhere we pass entity/field names that match the backend. GraphQL may return camelCase in responses; the permission object might use snake_case keys. Confirm from actual `myPermissions` response and align column IDs (e.g. `isActive` vs `is_active`) so field-level checks match.

**Action:**

- Document the exact shape of `myPermissions.entities` (and nested `fields`) as returned by the backend. In column definitions and `useCanReadField` / `useAccessibleFields`, use the same keys.

---

## 6. Cost fields and future entities

**Source:** BACKEND_IMPLEMENTATION_STATE.md + BRD/SRS — When cost-related entities are added, use the same permission pattern.

**Action:**

- For any new entity with cost or sensitive fields: use `myPermissions` as source of truth, `PermissionGuard` for entity actions, `FieldGuard` or dynamic columns from `useAccessibleFields` / `useCanReadField`. Do not hardcode role names; use the API.

---

## 7. Debug / console logs

**Current:** Production code still contains `console.log` in:

- `src/hooks/usePermissions.ts` — `useHasEntityAccess` (multiple logs)
- `src/hooks/graphql/usePermissionsQuery.ts` — `useMyPermissions` (token, executing, result)
- `src/hooks/useAuthQueries.ts` — `useAuth` (permissions query data, raw/converted permissions, set in store, no data)

**Action:**

- Remove these or guard with `import.meta.env.DEV` so production builds don’t log permission or auth data.

---

## 8. useRefreshPermissions

**Current:** `useRefreshPermissions` in `src/hooks/useAuthQueries.ts` only shows a toast and does not refetch `myPermissions` or update the store.

**Action:**

- Implement so it invalidates the permissions query (e.g. `queryClient.invalidateQueries({ queryKey: permissionKeys.my() })`), refetches, and syncs the new result to the auth store (same as the effect in `useAuth`). Useful after an admin changes the current user’s permissions or after a 403.

---

## Summary table

| # | Gap | Status | Priority | File(s) / area |
|---|-----|--------|----------|----------------|
| — | entityPermissions/fieldPermissions require roleId | ✅ Fixed | — | permissions.queries.ts, usePermissionsQuery.ts |
| 1 | No token refresh on 401 | Open | High | graphql/client.ts, auth store (store refresh token), useAuthMutation |
| 2 | Permissions null briefly after login | Open | Medium | useAuthQueries, Login flow, PermissionGuard |
| 3 | Users list columns not filtered by field permissions | Open | High | pages/users/UsersList.tsx |
| 4 | /users not protected by list permission | Open | Medium | src/App.tsx |
| 5 | Entity/field name casing vs backend | Open | Medium | usePermissions, column defs, types |
| 6 | Cost fields use same permission pattern | Forward-looking | When adding cost UI | New entity/field UIs |
| 7 | Remove or guard console.log in permissions/auth | Open | Low | usePermissions.ts, usePermissionsQuery.ts, useAuthQueries.ts |
| 8 | useRefreshPermissions should refetch and sync store | Open | Low | useAuthQueries.ts |

---

*Last re-scanned after aligning permission queries and hooks with BACKEND_IMPLEMENTATION_STATE.md. For roles, entity permissions, and field-level permissions, BACKEND_IMPLEMENTATION_STATE.md is the source of truth.*
