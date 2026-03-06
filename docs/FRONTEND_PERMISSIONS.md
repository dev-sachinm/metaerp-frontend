# Frontend permissions and field-level restrictions

## 1. How are permissions for the current user held?

- **Store:** Permissions for the logged-in user are kept in the **Zustand auth store** (`src/stores/authStore.ts`) as `permissions: PermissionsResponse | null`.
- **Shape:** `PermissionsResponse` has an `entities` map: for each entity (e.g. `user`, `customer`, `role`), we store:
  - Entity-level: `create`, `read`, `update`, `delete`, `list`
  - Field-level: `fields: { [fieldName]: { read, write } }`
- **Source:** On login, the GraphQL `login` mutation returns `permissions.byRole` (permissions grouped by role name). The frontend converts this into the flat `entities` shape with **OR** logic across roles using `mergeByRoleToEntities()` in `src/lib/permissions.ts`, then calls `setPermissions(permissionsResponse)`. The same conversion is used when syncing from `myPermissions` in `useAuthQueries`.
- **Usage:** Components use hooks from `src/hooks/usePermissions.ts` (e.g. `useCanAccess(entity, action)`, `useAccessibleFields(entity, 'read')`, `useCanReadField(entity, fieldName)`).

So: **one place (auth store), one shape (entities + fields), filled from login/myPermissions and consumed via permission hooks.**

---

## 2. Are field-level restrictions in place on the frontend? How is it done?

Yes. Field-level **read** restrictions are applied so that list and form UIs only show fields the user is allowed to read.

- **List views:**  
  - **Users list** (`UsersList.tsx`) already used `useAccessibleFields('user', 'read')` and only rendered columns for which the user has read (or write) permission.  
  - **Master data lists** (Customers, Product Categories, UOM, Tax, Payment Terms, Expense Categories, Suppliers, Vendors, Products) now do the same: each list calls `useAccessibleFields(<entity>, 'read')` and builds columns only for fields where `canShowColumn(readableFields, fieldKey)` is true.
- **Helper:** `canShowColumn(readableFields, fieldKey)` in `usePermissions.ts` returns:
  - `false` if `readableFields` is empty (no fields have the given permission → hide column),
  - otherwise `true` only when `fieldKey` is in the readable list (with camelCase normalization for backend snake_case).
- **Forms:** `FieldGuard` and edit pages use field-level hooks (e.g. `useCanReadField`, `useCanEditField`, `useIsFieldHidden`) to hide or disable fields the user may not read or write.

So: **field-level restrictions are in place:** list columns and form fields are gated by the same permission data and helpers; if a field has no read permission, it is not shown in the list (and can be hidden/read-only in forms via the existing guards).

---

## Entity names used for field permissions (list views)

These must match the backend `entity_permissions.entity_name` (or your backend’s entity keys):

| List page              | Entity name used |
|------------------------|------------------|
| Customers              | `customer`       |
| Product Categories     | `product_category` |
| UOM                    | `uom`            |
| Tax                    | `tax`            |
| Payment Terms          | `payment_term`   |
| Expense Categories     | `expense_category` |
| Suppliers              | `supplier`       |
| Vendors                | `vendor`         |
| Products               | `product`        |
| Users                  | `user`           |

If your backend uses different keys (e.g. snake_case like `product_category`), ensure the `ENTITY` / entity string in each list matches.
