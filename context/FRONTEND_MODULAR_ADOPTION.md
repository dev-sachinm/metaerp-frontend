# Frontend Modular Adoption — React.js

**Audience:** Frontend developers building the METAERP UI in React.  
**Purpose:** Define exactly what the React app must adopt so it aligns with the backend’s **modular architecture** (enable/disable modules per tenant, tenant-scoped API).

**Related:** [MODULAR_MODULES_PROPOSAL.md](./MODULAR_MODULES_PROPOSAL.md) (backend module design).

---

## 1. Why the frontend must adopt this

The backend:

- Exposes **which modules are enabled** per tenant (e.g. `core`, `master_data`).
- **Guards** every module-specific query and mutation: if a module is disabled, the API returns a GraphQL error instead of data.
- Uses **tenant context** (e.g. `X-Tenant-ID` header) to decide enabled modules.

If the frontend does **not** adopt this:

- Users can open screens for modules that are disabled → they only see errors.
- Navigation and menus don’t reflect what the tenant can actually use.
- Multi-tenant behaviour becomes inconsistent and confusing.

So the React app must: **fetch enabled modules**, **send tenant context on every request**, and **drive UI (menus, routes, features) from the enabled-module list**.

---

## 2. What you must implement (checklist)

| # | Requirement | Description |
|---|-------------|-------------|
| 1 | **Send tenant on every GraphQL request** | Include the tenant identifier (e.g. `X-Tenant-ID` header or as configured) so the backend returns the correct enabled modules and data for that tenant. |
| 2 | **Fetch enabled modules at app load / login** | Call the `enabledModules` query once (e.g. after auth or when tenant is known). |
| 3 | **Store enabled modules in app state** | Keep the list in React state (e.g. Context, Redux, Zustand) so the whole app can read it. |
| 4 | **Drive navigation from enabled modules** | Show menu items / nav links only for modules that are enabled (e.g. show “Master Data” only if `master_data` is enabled). |
| 5 | **Guard routes for disabled modules** | Prevent users from opening URLs for disabled modules (redirect or show “Module not enabled”). |
| 6 | **Handle “module not enabled” errors** | When a query/mutation returns a GraphQL error like “Module 'xyz' is not enabled”, show a clear message and do not assume the feature is available. |
| 7 | **Refresh enabled modules when tenant changes** | If the user can switch tenant in the UI, call `enabledModules` again and update state so menus and routes reflect the new tenant. |

You do **not** need to mirror the backend’s folder structure. You do need to respect the **contract** below and use the enabled-module list to control what is visible and reachable.

---

## 3. Backend contract (what the frontend can rely on)

### 3.1 Tenant context

- **Header:** `X-Tenant-ID: <tenant_key>`
- Backend uses this (or a default from config) to resolve enabled modules and data for that tenant.
- The React app must send this header on **every** GraphQL (and API) request when the tenant is known.

### 3.2 Query: enabled modules

- **Query name:** `enabledModules` (or as exposed in your schema; might be under a root field like `enabledModules`).
- **Auth:** No auth required; returns module list for the tenant implied by the request (e.g. `X-Tenant-ID`).
- **Response shape:** List of objects with at least:
  - `module_id` (string) — e.g. `"core"`, `"master_data"`.
  - `enabled` (boolean).
  - `display_name` (string, optional).
  - `description` (string, optional).

Example GraphQL:

```graphql
query EnabledModules {
  enabledModules {
    moduleId
    enabled
    displayName
    description
  }
}
```

(Exact field names may be camelCase or snake_case depending on your schema; use introspection or schema docs to match.)

**Frontend use:** Filter to `enabled === true` and use `module_id` (and optionally `display_name`) for navigation and route guards.

### 3.3 Module IDs you will see

- **`core`** — Always on. Auth, users, roles, permissions.
- **`master_data`** — Customers, products, product categories, UOM, tax, payment terms, expense categories, suppliers, vendors.

Other module IDs (e.g. `project`, `design_bom`, `procurement`, …) will appear as they are added on the backend. The frontend should treat module IDs as opaque strings and show/hide features by presence in the enabled list, not by hardcoding a fixed set.

### 3.4 Errors when a module is disabled

- If a query or mutation is for a disabled module, the backend returns a **GraphQL error** (not a 200 with null).
- Message is along the lines of: `"Module '<module_id>' is not enabled for this deployment"`.
- The frontend must:
  - Detect this error (e.g. by message or error code if the backend adds one).
  - Show a user-friendly message (e.g. “This feature is not enabled for your organization”).
  - Not render or assume data for that feature.

---

## 4. React-specific guidance

### 4.1 Where to fetch enabled modules

- **When:** After the user is authenticated (or as soon as tenant is known if you support unauthenticated landing).
- **Where:** Top-level auth flow, router bootstrap, or a dedicated `App` / `AuthProvider` effect.
- **How:** One GraphQL request using the same client and headers (including `X-Tenant-ID`) that you use for the rest of the app.

### 4.2 Where to store enabled modules

- **Options:** React Context, Redux, Zustand, or similar.
- **Suggested:** A small context (e.g. `ModulesContext`) that holds:
  - `enabledModuleIds: string[]` — list of `module_id` where `enabled === true`.
  - Optional: full list of `{ moduleId, enabled, displayName, description }` if you need labels for nav.
- **Update:** When tenant or login changes, refetch `enabledModules` and update this state.

### 4.3 Driving navigation

- Build the main nav (sidebar, top menu, etc.) from the enabled modules:
  - Map `module_id` → route and label (use `display_name` from API or a local map).
  - Only add a link if `module_id` is in `enabledModuleIds`.
- Example:

  ```js
  const navItems = [
    { moduleId: 'core', path: '/users', label: 'Users & Roles' },
    { moduleId: 'master_data', path: '/master', label: 'Master Data' },
    // ...
  ].filter((item) => enabledModuleIds.includes(item.moduleId));
  ```

### 4.4 Route guards

- For routes that belong to a module (e.g. `/master/*` → `master_data`):
  - In your router (e.g. React Router), before rendering the page, check if the module is enabled.
  - If not enabled: redirect to home or a “Module not enabled” page.
- Example (conceptual):

  ```js
  function RequireModule({ moduleId, children }) {
    const { enabledModuleIds } = useModules();
    if (!enabledModuleIds.includes(moduleId)) {
      return <Navigate to="/module-not-enabled" state={{ moduleId }} />;
    }
    return children;
  }
  // Usage: <Route path="/master/*" element={<RequireModule moduleId="master_data"><MasterDataApp /></RequireModule>} />
  ```

### 4.5 Handling “module not enabled” in mutations/queries

- In your GraphQL client (e.g. Apollo, urql, react-query + fetch):
  - In the global error handler or per-operation `onError`, check for the “not enabled” message.
  - Show a toast or inline message: e.g. “This feature is not available for your organization.”
  - Optionally redirect to home or refresh the enabled-module list if you think tenant might have changed.

### 4.6 When tenant changes

- If the app supports switching tenant (e.g. tenant selector in the header):
  - On change: set new tenant (e.g. in context) and ensure subsequent requests use the new `X-Tenant-ID`.
  - Call `enabledModules` again and replace the stored list.
  - Re-run any logic that depends on enabled modules (e.g. rebuild nav, re-check route guards).

---

## 5. Suggested file / structure (optional)

You don’t have to follow this exactly; it’s a possible way to keep things clear.

```
src/
  api/
    client.js          # GraphQL client with X-Tenant-ID (and auth) in headers
    queries.js         # enabledModules query, etc.
  context/
    AuthContext.js     # user, tenant
    ModulesContext.js  # enabledModuleIds, setModules, loadEnabledModules()
  components/
    RequireModule.js   # route guard component
    AppNav.js          # nav built from enabledModuleIds
  pages/
    ModuleNotEnabled.js
  routes/
    index.js           # routes wrapped with RequireModule where needed
```

---

## 6. Summary table

| Topic | What to do |
|-------|------------|
| **Tenant** | Send `X-Tenant-ID` (or configured tenant) on every GraphQL request. |
| **Enabled modules** | Query `enabledModules` at load/login and when tenant changes; store in app state. |
| **Menus** | Show only links for modules that are in the enabled list. |
| **Routes** | Guard module-specific routes; redirect or show “not enabled” if module is disabled. |
| **Errors** | Handle “Module 'x' is not enabled” with a clear message and no assumption the feature exists. |
| **New modules** | Backend will add new module IDs; frontend should treat them as opaque and show/hide by list, not by hardcoding. |

Following this keeps the React app consistent with the backend’s modular, tenant-aware design and avoids broken or misleading UX when modules are disabled.
