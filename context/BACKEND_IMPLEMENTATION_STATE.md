# FastAPI GraphQL Field-Level Permissions - Frontend Integration Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Authentication Flow](#authentication-flow)
4. [GraphQL API](#graphql-api)
5. [Queries](#queries)
6. [Mutations](#mutations)
7. [Pagination](#pagination)
8. [Permission System](#permission-system)
9. [Frontend Integration Examples](#frontend-integration-examples)
10. [Error Handling](#error-handling)
11. [Best Practices](#best-practices)
12. [Audit Trail](#audit-trail)

---

## Project Overview

**FastAPI backend with GraphQL API and field-level permissions system.**

### Key Features
- ✅ GraphQL API with full introspection
- ✅ **Login by username** (and password); JWT with refresh tokens (1 hour access, 7 days refresh)
- ✅ Role-based access control (RBAC)
- ✅ Entity-level permissions (Create, Read, Update, Delete)
- ✅ Field-level permissions (control which fields can be read/written)
- ✅ Pagination (varies by query: e.g. `users` uses `skip`/`limit`; **Master Data** list queries use `page` / `pageSize` with `pageSize` capped at **200**)
- ✅ Permission caching with Redis
- ✅ Auto-discovery schema (no manual sync needed)

### Technology Stack
- **Backend**: FastAPI 0.109.0
- **GraphQL**: Strawberry 0.291.3
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **Auth**: JWT (python-jose)
- **Cache**: Redis
- **Python**: 3.10+

### Endpoints
- **GraphQL**: `http://localhost:8000/graphql`
- **GraphQL Playground**: `http://localhost:8000/graphql`
- **Health Check**: `http://localhost:8000/health`
- **API Docs**: `http://localhost:8000/docs`

### Entity enums and sync script
- **Runtime (GraphQL / permissions):** `app/application/services/entity_discovery_service.py` introspects SQLAlchemy models and returns **canonical singular** entity keys via `app.domain.entity_keys.canonical_entity_key` (same rules as `entity_permissions.entity_name` in the DB).
- **Static file (optional):** `app/domain/enums.py` holds generated `EntityEnum` and per-entity `*FieldsEnum` for typing and tooling. It is **not** what `getEnumEntities` reads at runtime.
- **Sync script:** `python scripts/sync_entity_enums.py` walks mapped models, applies **canonical singular** keys (plural/legacy class names collapse via `canonical_entity_key`), excludes `entity_permission`, `field_permission`, `refresh_token`, and regenerates `app/domain/enums.py` atomically.

---

## Quick Start

### 1. Access GraphQL Playground

Open browser and navigate to:
```
http://localhost:8000/graphql
```

### 2. Login to Get Token

Run this mutation in the playground:

```graphql
mutation {
  login(username: "superadmin", password: "superadmin123") {
    accessToken
    refreshToken
    tokenType
    user {
      id
      username
      email
      isActive
    }
    permissions {
      byRole
    }
  }
}
```

**Response:** Login returns tokens, user (all profile fields; no `roles` on user — role names are keys of `permissions.byRole`), and permissions grouped by role.

```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "bearer",
      "user": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "firstName": null,
        "lastName": null,
        "dateOfBirth": null,
        "mobileNumber": null,
        "username": "superadmin",
        "email": "superadmin@example.com",
        "isActive": true
      },
      "permissions": {
        "byRole": {
          "superadmin": {
            "user": {
              "create": true,
              "read": true,
              "update": true,
              "delete": true,
              "fields": {
                "id": {"read": true, "write": false},
                "email": {"read": true, "write": true}
              }
            },
            "role": {
              "create": true,
              "read": true,
              "update": true,
              "delete": true,
              "fields": { "id": {"read": true, "write": false}, "name": {"read": true, "write": true} }
            }
          }
        }
      }
    }
  }
}
```

### 3. Set Authorization Header

Click **HTTP HEADERS** (bottom left in playground) and add:

```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
}
```

### 4. Run Your First Query

```graphql
query {
  currentUser {
    id
    firstName
    lastName
    dateOfBirth
    mobileNumber
    username
    email
    isActive
    roles
  }
}
```

---

## Authentication Flow

### Login Process

```mermaid
sequenceDiagram
    Frontend->>GraphQL: login(username, password)
    GraphQL->>Database: Verify credentials
    Database-->>GraphQL: User data
    GraphQL-->>Frontend: { accessToken, refreshToken, user, permissions }
    Frontend->>Frontend: Store tokens
    Frontend->>GraphQL: Query with Bearer token
    GraphQL-->>Frontend: Protected data
```

### Token Management

**Access Token:**
- Lifetime: 1 hour
- Usage: Include in Authorization header for all requests
- Format: `Bearer <token>`

**Refresh Token:**
- Lifetime: 7 days
- Usage: Get new access token when expired
- Storage: HttpOnly cookie (recommended) or secure storage

### Token Refresh

When access token expires:

```graphql
mutation {
  refresh(refreshToken: "your-refresh-token") {
    accessToken
    tokenType
  }
}
```

**Response:**
```json
{
  "data": {
    "refresh": {
      "accessToken": "new-access-token",
      "tokenType": "bearer"
    }
  }
}
```

### Test Credentials

Login is by **username** (not email). Users are seeded by default:

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| `superadmin` | `superadmin123` | superadmin | Full access to all entities and fields |
| `admin` | `admin123` | admin | Full access |
| `manager` | `manager123` | manager | Limited access (read users, manage roles) |
| `employee` | `employee123` | employee | Read-only access |

**Note:** Login and `myPermissions` return permissions **by role** (`permissions.byRole`). There is no separate `roles` field on the login user object; role names are the keys of `byRole`.

---

## GraphQL API

### Keeping this document in sync with GraphQL changes

Introspection helps tools discover types, but **`BACKEND_IMPLEMENTATION_STATE.md` is the project contract** for UI and integrations. Whenever you change **any** GraphQL query, mutation, argument, default, or return shape:

1. **Update the tables** in this file for that query/mutation (full argument list and description).
2. **Search and filter parameters:** If you add, rename, or remove optional search/filter args on a list or view, update:
   - the row in the main **GraphQL Query and Mutation Reference → Queries** table, and  
   - the **Master Data list search parameters (quick reference)** subsection (immediately below the Master Data query table).
3. **Examples:** Refresh any inline GraphQL examples that still show old signatures (for example `skip`/`limit` vs `page`/`pageSize`).
4. **Summary:** Adjust the closing **Summary** bullets if the high-level API contract changes.

Skipping doc updates causes frontend and tests to drift from the real schema; treat doc updates as part of the same change as the code.

### Schema Introspection

GraphQL provides **automatic schema discovery**. Use introspection alongside this document, not instead of updating it when the API changes.

**In GraphQL Playground:**
1. Click **< Docs** button (bottom right)
2. Browse all available queries, mutations, and types
3. Read field descriptions and types
4. Get autocomplete in your queries

**Programmatic Introspection:**

```graphql
query {
  __schema {
    types {
      name
      description
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
}
```

### Available Types

```graphql
type UserType {
  id: String!
  firstName: String
  lastName: String
  dateOfBirth: Date
  mobileNumber: String
  username: String
  email: String
  isActive: Boolean!
  roles: [String!]!
}

# User in login response (no roles field; roles are keys in permissions.byRole)
type LoginUserType {
  id: String!
  firstName: String
  lastName: String
  dateOfBirth: Date
  mobileNumber: String
  username: String
  email: String
  isActive: Boolean!
}

# Permissions grouped by role: { roleName: { entityName: { create, read, update, delete, fields } } }
type PermissionsType {
  byRole: JSON!
}

type RoleType {
  id: String!
  name: String!
  description: String
}

type EntityPermissionType {
  id: String!
  entityName: String!
  canCreate: Boolean!
  canRead: Boolean!
  canUpdate: Boolean!
  canDelete: Boolean!
}

type FieldPermissionType {
  id: String!
  entityName: String!
  fieldName: String!
  canRead: Boolean!
  canWrite: Boolean!
}

type PaginatedUsersType {
  items: [UserType!]!
  total: Int!
  skip: Int!
  limit: Int!
  page: Int!
  totalPages: Int!
  hasMore: Boolean!
}

type PaginatedRolesType {
  items: [RoleType!]!
  total: Int!
  skip: Int!
  limit: Int!
  page: Int!
  totalPages: Int!
  hasMore: Boolean!
}


input EntityPermissionInput {
  entityName: String!
  canCreate: Boolean!
  canRead: Boolean!
  canUpdate: Boolean!
  canDelete: Boolean!
}

input FieldPermissionInput {
  entityName: String!
  fieldName: String!
  canRead: Boolean!
  canWrite: Boolean!
}

type RoleWithPermissionsType {
  role: RoleType!
  entityPermissions: [EntityPermissionType!]!
  fieldPermissions: [FieldPermissionType!]!
}

type EntityInfoType {
  name: String!
  displayName: String
  description: String
}

type FieldInfoType {
  name: String!
  displayName: String
  type: String
  description: String
}

# Module enable/disable (DB-driven). Use enabledModules query for single source of truth.
type ModuleStatusType {
  moduleId: String!
  enabled: Boolean!
  displayName: String
  description: String
}
```

### Two different concepts: feature flags vs module enable/disable

**Module enable/disable (what this app has)**  
- **What:** Product/deployment capability — e.g. “Master Data”, “Procurement” on or off.  
- **Where:** Table `module_registry`; GraphQL **`enabledModules`** query and **`setModuleEnabled`** mutation.  
- **Purpose:** Control which parts of the product are available (by deployment); modular architecture.  
- **Single source of truth for UI:** **`enabledModules`** query (backed by `module_registry` + cache).

**Feature flags (development / rollout — not implemented in this app)**  
- **What:** Toggles for work-in-progress or gradual rollout — e.g. “new dashboard”, “beta export”, “dark mode”, “v2 API”.  
- **Purpose:** Ship code behind a switch; turn on for % of users or segments; kill switch; A/B tests.  
- **Not the same as** module_registry; they answer “is this *capability* on for this deployment?” vs “is this *build*/experiment on for this user/request?”.

Below: how **feature flags** (the development kind) usually work in the real world. Module enable/disable stays as above.

---

### Module enable/disable in this app (single source of truth for UI)

**Query for the UI:** **`enabledModules`** — use it to drive menus, routes, and visibility for modules (e.g. Master Data, Procurement).

**Single source of truth:** DB table **`module_registry`** → **ModuleService** (cached) → **`enabledModules`** GraphQL query → UI.  
**Where module enable/disable can be updated:**
- **GraphQL (recommended):** **`setModuleEnabled(moduleId: String!, enabled: Boolean!)`** mutation. Requires auth and **update permission on `role`** entity. Call from an admin/settings UI (e.g. “Modules” or “Settings”).
- **Database:** Direct write to table **`module_registry`** (columns: `module_id`, `enabled`, `display_name`, `description`). Use for migrations, scripts, or support; cache is invalidated when `ModuleService.set_module_enabled` is used (not when you write to DB directly — restart or wait for cache TTL if you only touch DB).
- **Admin UI:** Not part of this backend; the frontend can build a screen that calls `setModuleEnabled` for users with the right permission.

**Note:** Tenant ID is not maintained; the backend does not read any tenant header. Module state is deployment-wide (config cache key only).

---

### Feature flags (development / rollout) — how it works in the real world

Feature flags here means: *flags used during development and release* (hide WIP, gradual rollout, experiments, kill switch), **not** module_registry.

**Typical flow:**

1. **Single source of truth**  
   - A **feature-flag store**: either a **dedicated service** (LaunchDarkly, Unleash, Split, Flagsmith, etc.) or your **own API + DB** (e.g. `feature_flags` table + admin UI).  
   - Each flag has a key (e.g. `new_dashboard`), optional targeting (user id, segment, %, environment).

2. **Who sets flags**  
   - Product / ops / developers in a **dashboard** or config.  
   - No code deploy needed to turn a flag on or off (or change % rollout).

3. **Who reads flags**  
   - **Backend:** calls the flag service or reads from DB; can enforce “this API is behind a flag” and return 403 or hide data.  
   - **Frontend:** either (a) gets flag state from **your backend** (e.g. a “features” or “featureFlags” field on `currentUser` or a dedicated query), or (b) uses the **flag provider’s SDK** (e.g. LaunchDarkly JS SDK) and gets flags in the browser.  
   - **Single source of truth for the UI:** one of: your GraphQL/REST “what’s on for this user?” endpoint, or the vendor’s SDK (which talks to their API).

4. **Common patterns**  
   - **Vendor (LaunchDarkly, Unleash, etc.):** They host the store and API; you integrate via SDK or server-side API. Flags can be user/tenant/environment/percentage based.  
   - **In-house:** DB table(s) for flags + optional targeting; your backend (or a small flag service) evaluates “is flag X on for user/tenant Y?” and exposes that via your API so UI and backend share the same truth.  
   - **Config/env:** Simple flags (e.g. `ENABLE_BETA_EXPORT=true`) in env or config; backend reads and exposes them. No per-user targeting; good for global toggles.

5. **What the UI does**  
   - On load (or when user/tenant changes): **fetch flag state** (from your API or SDK).  
   - Store in app state; **drive rendering** (show/hide components, routes, experiments) from that.  
   - Don’t hardcode “is beta on?” — always read from the same source (your API or the flag service).

6. **Where feature flags (dev kind) get updated**  
   - **Vendor (LaunchDarkly, Unleash, etc.):** In the **vendor’s dashboard** (create/edit flags, targeting, % rollout). No code or DB change in your app.  
   - **In-house:** In your **admin UI** or via an **API** that writes to your feature-flag store (DB or config). Who can update is controlled by your auth/permissions.  
   - **Config/env:** In **deployment config** or env vars; change and redeploy or restart. No per-user targeting.

**Summary:** For **feature flags** (development/rollout), the real world usually has a **dedicated store** (vendor or in-house) that is the single source of truth; backend and/or frontend read from it; the UI gets “what’s on for this user/request” from one place (your API or the vendor SDK). That is separate from **module enable/disable** in this app, which is **`module_registry`** + **`enabledModules`**.

**This backend:** This backend **does not** expose a feature-flag API (no query or mutation for dev/rollout flags). The frontend can use a **vendor** (e.g. LaunchDarkly, Unleash) and their SDK, or plan for an in-house endpoint if needed. For **module** visibility, use **`enabledModules`** and [FRONTEND_MODULAR_ADOPTION.md](./FRONTEND_MODULAR_ADOPTION.md).

### GraphQL Query and Mutation Reference

All operations exposed by the schema:

#### Queries

**Core (module: core; auth required unless noted)**

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `hello` | — | `String!` | Test field; returns a welcome message. No auth required. |
| `getEnumEntities` | — | `[EntityEnumItem!]!` | Entity key (as in `entity_permissions.entity_name`) → display name for UI. Each item has `key` and `displayName`. No auth required. |
| `getEnumFields` | `entityId: String!` | `[FieldEnumItem!]!` | Field key (as in `field_permissions.field_name`) → display name for UI. Each item has `key` and `displayName`. Returns `[]` for unknown entity. No auth required. |
| `enabledModules` | — | `[ModuleStatusType!]!` | **Single source of truth for module visibility.** List all modules and their enabled state (DB-driven). Returns `moduleId`, `enabled`, `displayName`, `description`. No auth required. |
| `currentUser` | — | `UserType` | Current authenticated user (id, firstName, lastName, dateOfBirth, mobileNumber, username, email, isActive, roles). `null` if not authenticated. |
| `user` | `userId: String!` | `UserType` | Get a single user by id. Returns all user fields. Requires read permission on `user` entity. Returns `null` if user not found or no permission. |
| `users` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `roleId: String`, `roleName: String` | `PaginatedUsersType!` | Page-based list of users. Requires read permission on `user` entity. `roleId` or `roleName` (mutually exclusive — `roleId` takes priority) filters to users assigned to that role. Use `roleName: "Assembly"` to get Assembly-role users for the Collected by Assembly dropdown. Response: `items`, `total`, `skip`, `limit`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `getRoles` | `roleId: String` | `[RoleType!]!` | Get roles. If `roleId` is provided, returns that specific role. Otherwise returns all roles (just role table rows with all fields). Requires read permission on `role` entity. |
| `getRolePermissions` | `roleId: String!` | `RoleWithPermissionsType` | Get role with all its entity and field permissions. Returns role, entityPermissions (list), and fieldPermissions (list). Requires read permission on `role` entity. |
| `myPermissions` | — | `PermissionsType` | Current user's permissions grouped by role (`byRole`). `null` if not authenticated. |
| `entities` | — | `[EntityInfoType!]!` | List ALL entities that CAN have permissions configured (master entity list). Returns entities from **ORM discovery** (`entity_discovery_service` + `app/domain/registry.py` display metadata), regardless of whether permissions exist. Works even on day one when no permissions exist. Requires read permission on `role` entity. |
| `entityFields` | `entityName: String!` | `[FieldInfoType!]!` | List ALL fields for a given entity that CAN have permissions configured. Uses SQLAlchemy model introspection to discover fields from the entity's model. Works even when no permissions are configured yet. Requires read permission on `role` entity. |

**Master Data (module: master_data; requires `master_data` enabled. All require auth + entity-level permissions.)**

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `productCategories` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `nameContains: String`, `parentId: String` | `ProductCategoryListType!` | Page-based product categories. `nameContains` = case-insensitive name search. `parentId` = filter by parent category. Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `productCategory` | `id: String!` | `ProductCategoryType` | Single product category by id. Includes `parentId` and `parentName`. `null` if not found. |
| `customers` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `nameContains: String`, `codeContains: String`, `contactNameContains: String`, `emailContains: String` | `CustomerListType!` | Page-based customers. `contactNameContains` searches both primary and secondary contact names. `emailContains` searches both primary and secondary emails. Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `customer` | `id: String!` | `CustomerType` | Single customer by id. `null` if not found. |
| `uomList` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `searchContains: String` | `UOMListType!` | Page-based UOMs. `searchContains` matches against both `code` and `name` (OR). Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `uom` | `id: String!` | `UOMType` | Single UOM by id. `null` if not found. |
| `taxList` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `nameContains: String`, `codeContains: String`, `rateMin: Float`, `rateMax: Float` | `TaxListType!` | Page-based taxes. `rateMin`/`rateMax` filter by `rate_percent` range (inclusive). Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `tax` | `id: String!` | `TaxType` | Single tax by id. `null` if not found. |
| `paymentTermsList` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `nameContains: String`, `codeContains: String`, `daysMin: Int`, `daysMax: Int` | `PaymentTermListType!` | Page-based payment terms. `daysMin`/`daysMax` filter by number of days (inclusive). Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `paymentTerm` | `id: String!` | `PaymentTermType` | Single payment term by id. `null` if not found. |
| `expenseCategoriesList` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `nameContains: String`, `codeContains: String`, `parentId: String` | `ExpenseCategoryListType!` | Page-based expense categories. `parentId` filters to sub-categories of a given parent. Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `expenseCategory` | `id: String!` | `ExpenseCategoryType` | Single expense category by id. Includes `parentId` and `parentName`. `null` if not found. |
| `suppliers` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `nameContains: String`, `codeContains: String`, `contactPersonContains: String`, `emailContains: String` | `SupplierListType!` | Page-based suppliers. All text filters are case-insensitive. Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `supplier` | `id: String!` | `SupplierType` | Single supplier by id. `null` if not found. |
| `vendors` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `nameContains: String`, `codeContains: String`, `contactPersonContains: String`, `emailContains: String` | `VendorListType!` | Page-based vendors. All text filters are case-insensitive. Response: `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `vendor` | `id: String!` | `VendorType` | Single vendor by id. `null` if not found. |
| `products` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `categoryId: String`, `itemCodeContains: String`, `nameContains: String`, `descriptionContains: String`, `makeContains: String`, `puUnitId: String`, `stkUnitId: String`, `locationInStoreContains: String` | `ProductListType!` | Page-based products. All text filters are case-insensitive "contains". `puUnitId`/`stkUnitId` = exact UOM id match. Response: `items` (includes `unitPrice`), `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. |
| `product` | `id: String!` | `ProductType` | Single product by id. Includes `itemCode`, `name`, `description`, `make`, `puUnitId`, `stkUnitId`, `procMtd`, `locationInStore`, `quantity`, `unitPrice`, `isActive`. `null` if not found. |
| `purchaseOrders` | `page: Int = 1`, `pageSize: Int = 20` (max 200), `isActive: Boolean`, `poNumberContains: String`, `titleContains: String`, `poStatusContains: String` | `PurchaseOrderListType!` | Page-based paginated purchase orders with optional search. `poNumberContains` performs a case-insensitive partial match on `po_number` across **all pages** — use this for cross-page PO number search. `titleContains` filters on title, `poStatusContains` on status. **Role-based scoping:** users with roles `superadmin`, `Project Manager`, or `Operations Head` / `Operations Head (Owner)` see all POs; every other role sees only POs they created. Response includes `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. Each `PurchaseOrderType` item includes `fixtureId` (derived from line items) and `projectName` (resolved from `project_id`). |
| `purchaseOrder` | `id: String!` | `PurchaseOrderType` | Single purchase order by id. **Role-based scoping:** same rules as `purchaseOrders` — non-privileged users receive an error if the requested PO was not created by them. Includes `poNumber`, `title`, `poType`, `projectId`, `projectName`, `fixtureId`, `details`, `vendorId`, `vendorName`, `supplierId`, `supplierName`, `attachments` (raw JSON string), `parsedAttachments` (typed list of `POAttachmentType`: `id`, `s3Key`, `filename`, `name`, `type`, `uploadedAt`), `poSendDate`, `poStatus` (`POStatusEnum`: `Created` | `CostingUpdated` | `Completed`), `costingUpdatedDate` (auto-set by `confirmCosting`), `completedDate` (auto-set when `poStatus` → `Completed`), `enableCosting` (bool, default `true` — when `false`, `parseCostingExcel` and `confirmCosting` raise "Costing is restricted"), `lineItems`, and audit fields (`createdAt`, `modifiedAt`, `createdBy`, `modifiedBy`). `fixtureId` is resolved from the first line item's `fixture_bom → fixture`. `projectName` is resolved from `project_id`. `lineItems` returns `PurchaseOrderLineItemType`. `purchaseUnitPrice` source depends on `poType`: `ManufacturedPart` → `fixture_bom.purchase_unit_price`; `StandardPart` → `products.unit_price` (via `fixture_bom.product_id`); `Miscellaneous` → `purchase_order_line_items.unit_price`. Own fields: `id`, `purchaseOrderId`, `fixtureBomId`, `description`, `expenseCategoryId`, `miscellaneousLineItemCost`, `unitPrice`, `orderedQuantity` (qty ordered in THIS PO for Standard Part POs; set by `createStandardPo`). Proxied from `fixture_bom`: `drawingNumber`, `bomDescription`, `quantity`, `status`, `lhRh`, `receivedQuantity`, `collectedByassemblyQuantity`, `collectedByUserId`, `collectedAt`. `lineItemsSummary` returns `PurchaseOrderLineItemsSummaryType` with `totalCost` (sum of all resolved `purchaseUnitPrice × quantity`) and `itemCount`. |
| `purchaseOrdersByFixture` | `fixtureId: String!`, `poType: String = "StandardPart"`, `partIds: [String!]` | `[PurchaseOrderType!]!` | Returns non-deleted PurchaseOrders that contain at least one line item linked to the given fixture. Optional `partIds` (list of fixture_bom row IDs from `standardPartsForPo`) — when supplied, only POs that have at least one line item in the given set are returned. **UI usage:** call on popup open with the IDs of rows where `orderQty > 0` so the "Existing Open POs" section shows only POs relevant to the selected item codes. Each returned `PurchaseOrderType` includes full `lineItems` with `orderedQuantity`. Module: `project_management`. Role-scoped same as `purchaseOrders`. |
| `standardPartsForPo` | `fixtureId: String!` | `[StandardPartForPoType!]!` | Returns standard-part rows for the **Create Supplier PO popup**. Each row includes `id` (fixture BOM row id, used as `partId` in `createStandardPo`), `itemCode`, `productName`, `productMake`, `uom`, `lhRh`, `expectedQty` (BOM quantity), `currentStock` (latest from Product master), `openOrderQty` (sum of `ordered_quantity` from all non-deleted, non-Completed POs for this part), `orderQty` = `max(0, expectedQty - currentStock - openOrderQty)` (auto-calculated, read-only — the quantity for this PO), `purchaseUnitPrice`, `supplierId`, `supplierName`. **`orderQty`** is the auto-calculated order quantity; rows where `orderQty <= 0` are shown red and skipped. **`openOrderQty`** shows the total already ordered on open POs. User does NOT edit quantities — just selects a Supplier and submits. The UI calls this on popup open **and** again before submit for freshness. Module: `project_management`. Requires `fixture_bom.read`. |
| `exportPurchaseOrderLineItemsXlsx`, `getPurchaseOrderAttachmentUploadUrl` | `id: String!` | `PoExcelExportType` (`s3Key`, `downloadUrl`) | Export the line items of a purchase order to an XLSX file on S3; returns a presigned download URL. |
| `exportCollectByAssemblyExcel` | `fixtureBomIds: [String!]!`, `collectedByUserId: String!` | `CollectByAssemblyResultType` (`s3Key`, `downloadUrl`) | Generate an Excel of assembly-collected BOM items (both manufactured and standard) with assembly user first/last name. Returns presigned S3 URL valid 1 hour. Requires `fixture_bom.read`. |
| `getPurchaseOrderAttachmentUploadUrl` | `poId: String!`, `filename: String!` | `PurchaseOrderAttachmentUploadUrlType` | Get a presigned URL for uploading a generic attachment to a purchase order. Returns `uploadUrl`, `s3Key`, and `poId`. **For Standard Part POs**, only Excel (`.xlsx`, `.xls`), PDF (`.pdf`), CSV (`.csv`), and image (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.tiff`) files are permitted; other extensions return a `GraphQLError`. |
| `getPurchaseOrderAttachmentDownloadUrl` | `s3Key: String!` | `POAttachmentDownloadUrlType` | Get a presigned download URL for any PO attachment given its S3 key (from `parsedAttachments.s3Key`). Returns `downloadUrl`, `s3Key`, `filename`. In dev/fake-S3 mode returns a `/fake-s3-download` URL. Requires `master_data` module. |
| `auditLogs` | `page: Int = 1`, `pageSize: Int = 20`, `userId: String`, `userNameContains: String`, `action: String`, `entityName: String`, `entityId: String`, `requestId: String`, `source: String`, `fieldName: String`, `oldValueContains: String`, `newValueContains: String`, `fromDate: String`, `toDate: String` | `AuditLogListType!` | Paginated audit trail. Returns field-level change history with request context (IP, user agent, source, request correlation ID). Permission: `audit_log.read`. Response: `items`, `total`, `skip`, `limit`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`. See [Audit Trail](#audit-trail) section. |

`isActive` behavior for all Master Data list queries:
- `isActive: true` → only active records
- `isActive: false` → only inactive records
- omit `isActive` (or pass `null`) → both active and inactive records

#### Master Data list search parameters (quick reference)

All arguments below are optional unless noted. Omit them or pass `null` to apply no filter. Unless stated otherwise, `*Contains` arguments are **case-insensitive substring** (`ILIKE`) matches on the server.

| Query | Pagination + status | Search / filter arguments |
|-------|---------------------|---------------------------|
| `productCategories` | `page`, `pageSize`, `isActive` | `nameContains`, `parentId` (exact parent category id) |
| `customers` | `page`, `pageSize`, `isActive` | `nameContains`, `codeContains`, `contactNameContains` (primary **or** secondary contact name), `emailContains` (primary **or** secondary email) |
| `uomList` | `page`, `pageSize`, `isActive` | `searchContains` (matches **code OR name**) |
| `taxList` | `page`, `pageSize`, `isActive` | `nameContains`, `codeContains`, `rateMin`, `rateMax` (inclusive range on `rate_percent`) |
| `paymentTermsList` | `page`, `pageSize`, `isActive` | `nameContains`, `codeContains`, `daysMin`, `daysMax` (inclusive range on `days`) |
| `expenseCategoriesList` | `page`, `pageSize`, `isActive` | `nameContains`, `codeContains`, `parentId` (exact parent id) |
| `suppliers` | `page`, `pageSize`, `isActive` | `nameContains`, `codeContains`, `contactPersonContains`, `emailContains` |
| `vendors` | `page`, `pageSize`, `isActive` | `nameContains`, `codeContains`, `contactPersonContains`, `emailContains` |
| `products` | `page`, `pageSize`, `isActive` | `categoryId` (exact), `itemCodeContains`, `nameContains`, `descriptionContains`, `makeContains`, `puUnitId`, `stkUnitId` (exact UOM ids), `locationInStoreContains` |
| `purchaseOrders` | `page`, `pageSize`, `isActive` | `poNumberContains` (search PO number across all pages), `titleContains`, `poStatusContains` |

**Project Management & Design/BOM (module: project_management; requires `project_management` enabled. All require auth + entity-level permissions.)**

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `projects` | `skip: Int = 0`, `limit: Int = 100`, `status: String`, `customerId: String`, `isActive: Boolean` | `ProjectListType!` | Paginated projects (`items`, `total`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). **Scoped by assignment:** `superadmin` sees all projects; all other users see only projects they are assigned to directly or via their role. |
| `project` | `id: String!` | `ProjectType` | Single project by id. Fields: `id`, `projectNumber`, `name`, `customerId`, `customerName`, `description`, `status`, `startDate`, `targetDate`, `actualDeliveryDate`, `budget`, `purchaseBudget`, `designerTargetDate`, `procurementTargetDate`, `manufacturingTargetDate`, `qualityTargetDate`, `assemblyTargetDate`, `isActive`, `remainingDays`, audit fields. `null` if not found. |
| `projectAssignments` | `projectId: String!` | `[ProjectAssignmentType!]!` | List assignments for a project. Requires `read` permission on `project_assignment`. |
| `projectAssignmentBoard` | `projectId: String!` | `ProjectAssignmentBoardType` | Assignment screen payload (project, assignments, assignable users/roles, canAssign). Requires `update` permission on `project_assignment`. |
| `fixtures` | `projectId: String`, `status: String`, `isActive: Boolean`, `skip: Int = 0`, `limit: Int = 100` | `FixtureListType!` | Paginated fixtures (`items`, `total`, `skip`, `limit`). Item fields: `id`, `projectId`, `fixtureNumber`, `fixtureSeq`, `description`, `status`, `s3BomKey`, `bomFilename`, `bomUploadedAt`, `bomUploadedBy`, `isActive`, `assemblyUserId`, `assemblyUserName`, `assemblyReceivedQuantity`, audit fields. |
| `fixture` | `id: String!` | `FixtureType` | Single fixture by id. Same fields as list item. `null` if not found. |
| `bomView` | `fixtureId: String!`, `drawingNoContains: String`, `drawingDescriptionContains: String`, `standardPartItemCodeContains: String`, `standardPartNameContains: String`, `standardPartMakeContains: String`, `pendingDateFrom: DateTime`, `pendingDateTo: DateTime`, `inprogressDateFrom: DateTime`, `inprogressDateTo: DateTime`, `qcDateFrom: DateTime`, `qcDateTo: DateTime`, `receivedDateFrom: DateTime`, `receivedDateTo: DateTime` | `BomViewType` | Full BOM view for a fixture, with optional search filters. Returns `fixture`, `manufacturedParts` (list of `BomManufacturedPartType`), and `standardParts` (list of `FixtureProductType`). **Persistence:** both lists are backed by the unified table **`fixture_bom`** (`part_type` = `manufactured` \| `standard`). Standard parts include `qty` (expected from BOM), `currentStock` (from Product master), `purchaseQty` = `max(0, qty − currentStock)`. Text filters are applied as case-insensitive "contains" matches on drawing number/description and standard-part itemCode/name/make. **Status date range filters** (`pendingDateFrom/To`, `inprogressDateFrom/To`, `qcDateFrom/To`, `receivedDateFrom/To`) filter manufactured parts by their status date — a part is included only if its date is set and falls within the supplied range (both bounds inclusive). `null` if fixture not found. **Status date fields on manufactured parts:** `pendingAt`, `inprogressAt`, `qualityCheckedAt`, `receivedAt` — each is `null` until that status is first entered; once set it is never overwritten. **Assembly collection fields (both `BomManufacturedPartType` and `FixtureProductType`):** `collectedByassemblyQuantity` (cumulative collected qty), `collectedByUserId` (last assembly user), `collectedAt` (last collection timestamp) — set via `collectByAssembly` mutation. |
| `getDesignUploadUrl` | `fixtureId: String!`, `filename: String!` | `DesignUploadUrlType` | Get a presigned S3 upload URL for a BOM file (`.xlsx` or `.zip`). Returns `uploadUrl`, `s3Key`, `fixtureId`. PUT the file bytes to `uploadUrl` before calling `parseBomFile`. |
| `parseBomFile` | `fixtureId: String!`, `s3Key: String!` | `BomParseResultType` | **Fixture-level.** Parse a previously uploaded BOM ZIP (preview only — no DB write). Returns `manufacturedParts`, `standardParts`, `wrongEntries`, `errors`, `warnings`, `summary`. **ZIP layout:** BOM.xlsx header column accepted as `"Drawing No."`, `"Drawing No"`, or `"Drawing Number"`. **Excel is source of truth:** for each manufactured part, description, qty, and lhRh are taken from the BOM Excel row. PDF directories inside the ZIP validate existence. **`errors`** — Excel manufactured rows with no matching PDF directory in the ZIP (excluded from `manufacturedParts`, blocking). **`warnings`** — drawings found in ZIP PDF directories but absent from the BOM Excel; these are included in `manufacturedParts` using PDF-parsed values and flagged for review (non-blocking). **Qty fallback:** if Excel qty cell is blank/null, the PDF-parsed qty is used instead. `lhRh` is sourced from the Excel row. Each manufactured part includes `source` (`"pdf"`), `hasDrawing: true`. **Re-upload diff detection:** each parsed row is compared against the DB by `(drawingNumber, partType)`. Parts get `changeStatus` (`"changed"` \| `"unchanged"` \| `"new"` \| `null`), `changes` (list of `BomFieldChangeType {field, oldValue, newValue}`), `existingStatus`, `existingRowId`, `existingQty`, `drawingFileChanged`. Summary fields: `totalManufactured`, `totalStandard`, `wrongEntryCount`, `errorCount`, `warningCount`, `duplicateDrawingCount`, `fixtureMismatchCount`, `changedCount`, `unchangedCount`, `newCount`, `notUpdatableCount`. |
| `getDrawingViewUrl` | `partId: String!` | `DrawingViewUrlType` | Get a presigned GET URL to view/download a manufactured part's drawing file. Returns `viewUrl`, `partId`, `drawingNo`. Raises error if part has no drawing. |
| `getProjectBomUploadUrl` | `projectId: String!`, `filename: String!` | `ProjectBomUploadUrlType` | **Project-level.** Get a presigned S3 upload URL for a BOM file scoped to a project (no fixture needed). Returns `uploadUrl`, `s3Key`, `projectId`. PUT the file bytes to `uploadUrl`, then call `parseProjectBomFile`. |
| `parseProjectBomFile` | `projectId: String!`, `s3Key: String!` | `BomParseResultType` | **Project-level (preferred).** Parse BOM ZIP — same parsing rules as `parseBomFile`. **Excel is source of truth** for manufactured part description, qty, and lhRh; PDF directories validate existence. Returns `manufacturedParts`, `standardParts`, `wrongEntries`, `errors` (Excel rows with no PDF directory — blocking), `warnings` (PDF-only drawings not in Excel — non-blocking, included with PDF-parsed values). Fixture sequences are derived from drawing numbers. Each manufactured part includes `fixtureSeq`, `fixtureExists`, `existingFixtureId`, `existingFixtureNumber`, `isDuplicateInProject`, `duplicateFixtures`, `source` (`"pdf"`). Each standard part includes `fixtureSeq` (from Excel unit header). Summary includes `bomFixtureSeq`, `duplicateDrawingCount`, `fixtureMismatchCount`, `newFixtureSeqs`, `existingFixtureSeqs`, `errorCount`, `warningCount`. No DB writes. |
| `getManufacturedPoUploadUrl` | `fixtureId: String!`, `filename: String!` | `ManufacturedPoUploadUrlType` | Phase 4. Get a presigned S3 upload URL for a **user-edited manufactured PO Excel**. Returns `uploadUrl`, `s3Key`, `fixtureId`. PUT the edited Excel bytes to `uploadUrl`, then call `importManufacturedPoExcel(fixtureId, s3Key)`. |

**Email store (module: core; requires auth).**

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `emails` | `contextType: String`, `contextId: String` | `[EmailType!]!` | List stored emails for debugging/audit. If `contextType` / `contextId` provided, filters by those fields. |

#### Mutations

**Core (module: core)**

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `login` | `username: String!`, `password: String!` | `LoginResponseType` | Authenticate by username/password. Returns `accessToken`, `refreshToken`, `user` (LoginUserType), `permissions` (byRole), `tokenType`. Returns `null` on invalid credentials or inactive user. No auth required. |
| `refresh` | `refreshToken: String!` | `TokenType` | Issue a new access token. Returns `accessToken`, `tokenType`. Returns `null` if refresh token invalid or revoked. No auth required. |
| `createUser` | `firstName: String!`, `lastName: String!`, `username: String!`, `password: String!`, `dateOfBirth: Date`, `mobileNumber: String`, `email: String` | `UserType` | Create a user. If an `employee` role exists it is assigned automatically; otherwise the user is created with no roles. Optional: dateOfBirth, mobileNumber, email. **Requires authentication** and create permission on `user` entity. Current user is set as `createdBy`. |
| `updateUser` | `userId: String!`, `firstName: String`, `lastName: String`, `dateOfBirth: Date`, `mobileNumber: String`, `email: String`, `isActive: Boolean` | `UserType` | Update a user by id. All args except userId optional. Respects field-level write permissions. Requires update permission on `user` entity. Current user is set as `modifiedBy`. |
| `changePassword` | `currentPassword: String!`, `newPassword: String!` | `Boolean!` | Change the current user's password. Requires authentication. New password min 6 characters. |
| `setUserPassword` | `userId: String!`, `newPassword: String!` | `Boolean!` | Set another user's password (admin). Requires update permission on `user` entity. |
| `deleteUser` | `userId: String!` | `Boolean!` | Delete a user by id. Requires delete permission on `user` entity. |
| `deleteRole` | `roleId: String!` | `Boolean!` | Delete a role by id. Only role name `superadmin` cannot be deleted. Requires delete permission on `role` entity. |
| `addUserRole` | `userId: String!`, `roleId: String!` | `UserType` | Add a role to a user. Requires update permission on `user` entity. |
| `removeUserRole` | `userId: String!`, `roleId: String!` | `UserType` | Remove a role from a user. Requires update permission on `user` entity. |
| `upsertRoleWithPermissions` | `name: String!`, `roleId: String`, `description: String`, `entityPermissions: [EntityPermissionInput!]`, `fieldPermissions: [FieldPermissionInput!]` | `RoleWithPermissionsType` | Create or update a role with all its permissions in one transaction. Requires update permission on `role` entity. |
| `setModuleEnabled` | `moduleId: String!`, `enabled: Boolean!`, `displayName: String`, `description: String` | `ModuleStatusType` | Enable or disable a module (DB-driven); optionally update display name and description. Requires update permission on `role` entity. |

**Email store (module: core; requires auth).**

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `createEmail` | `input: CreateEmailInput!` (subject, body, toAddress, ccAddress, bccAddress, attachments, contextType, contextId) | `EmailType` | Create an email record with metadata and attachment descriptors. Does **not** send a real email; used by later phases to persist PO / manufacturing emails. Attachments are JSON `{ s3Key, filename }` objects pointing at S3/fake-S3. |

**Master Data (module: master_data; requires `master_data` enabled. All require auth + entity-level permissions.)**

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `createProductCategory` | `input: ProductCategoryInput!` (categoryName, parentId, isActive) | `ProductCategoryType` | Create product category. |
| `updateProductCategory` | `id: String!`, `input: ProductCategoryInput!` | `ProductCategoryType` | Update product category by id. |
| `deleteProductCategory` | `id: String!` | `Boolean!` | Delete product category by id. |
| `createCustomer` | `input: CustomerInput!` (name, code, address, contactInfo, primaryContactName, primaryContactEmail, primaryContactMobile, secondaryContactName, secondaryContactEmail, secondaryContactMobile, isActive) | `CustomerType` | Create customer. |
| `updateCustomer` | `id: String!`, `input: CustomerInput!` | `CustomerType` | Update customer by id. |
| `deleteCustomer` | `id: String!` | `Boolean!` | Delete customer by id. |
| `createUOM` | `input: UOMInput!` (code, name, isActive) | `UOMType` | Create UOM. |
| `updateUOM` | `id: String!`, `input: UOMInput!` | `UOMType` | Update UOM by id. |
| `deleteUOM` | `id: String!` | `Boolean!` | Delete UOM by id. |
| `createTax` | `input: TaxInput!` (name, code, ratePercent, isActive) | `TaxType` | Create tax. |
| `updateTax` | `id: String!`, `input: TaxInput!` | `TaxType` | Update tax by id. |
| `deleteTax` | `id: String!` | `Boolean!` | Delete tax by id. |
| `createPaymentTerm` | `input: PaymentTermInput!` (name, code, days, isActive) | `PaymentTermType` | Create payment term. |
| `updatePaymentTerm` | `id: String!`, `input: PaymentTermInput!` | `PaymentTermType` | Update payment term by id. |
| `deletePaymentTerm` | `id: String!` | `Boolean!` | Delete payment term by id. |
| `createExpenseCategory` | `input: ExpenseCategoryInput!` (name, code, parentId, isActive) | `ExpenseCategoryType` | Create expense category. |
| `updateExpenseCategory` | `id: String!`, `input: ExpenseCategoryInput!` | `ExpenseCategoryType` | Update expense category by id. |
| `deleteExpenseCategory` | `id: String!` | `Boolean!` | Delete expense category by id. |
| `createSupplier` | `input: SupplierInput!` (name, code, contactPerson, email, phone, address, isActive) | `SupplierType` | Create supplier. |
| `updateSupplier` | `id: String!`, `input: SupplierInput!` | `SupplierType` | Update supplier by id. |
| `deleteSupplier` | `id: String!` | `Boolean!` | Delete supplier by id. |
| `createVendor` | `input: VendorInput!` (name, code, contactPerson, email, phone, address, isActive) | `VendorType` | Create vendor. |
| `updateVendor` | `id: String!`, `input: VendorInput!` | `VendorType` | Update vendor by id. |
| `deleteVendor` | `id: String!` | `Boolean!` | Delete vendor by id. |
| `createProduct` | `input: ProductInput!` (name, categoryId, **itemCode**, description, make, **puUnitId**, **stkUnitId**, **procMtd**, **locationInStore**, quantity, isActive) | `ProductType` | Create product. **itemCode** replaces legacy part number; purchase/stock UOM are **puUnitId** and **stkUnitId** (both optional). |
| `updateProduct` | `id: String!`, `input: ProductInput!` | `ProductType` | Update product by id (same fields as create). |
| `deleteProduct` | `id: String!` | `Boolean!` | Delete product by id. |
| `createPurchaseOrder` | `input: PurchaseOrderInput!` (title, `poType`=StandardPart|ManufacturedPart|Miscellaneous, projectId, details, vendorId, supplierId, attachments, poSendDate, `poStatus`=Created|CostingUpdated|Completed (default `Created`), `enableCosting` (default `true`), isActive, `lineItems`, `lineItemIds`) | `PurchaseOrderType` | Create purchase order header. `poNumber` is auto-generated by backend in format `POYYMMDDNN`. `poStatus` defaults to `Created`. `enableCosting` defaults to `true` for `ManufacturedPart`; **always forced to `false` for `StandardPart` and `Miscellaneous`** regardless of input. Can accept `lineItemIds` or complex `lineItems` (`fixtureBomId`, `description`, `expenseCategoryId`, `miscellaneousLineItemCost`, `purchaseUnitPrice`). |
| `updatePurchaseOrder` | `id: String!`, `input: PurchaseOrderUpdateInput!` | `PurchaseOrderType` | Partial update purchase order by id (only provided fields are updated). Supports `attachmentsToAdd` / `attachmentsToRemove` to modify the stored attachments list. Supports `enableCosting` (bool) to toggle costing restriction. Can also update `projectId`, and replace `lineItems` or `lineItemIds`. When `poStatus` is set to `Completed`, `completedDate` is auto-stamped (only on first transition). When `lineItems` includes `purchaseUnitPrice`, the price is written back to the source table: `StandardPart` → `products.unit_price`; `ManufacturedPart` → `fixture_bom.purchase_unit_price`; `Miscellaneous` → `line_item.unit_price`. When `lineItems` includes `receivedQuantity`, it is written to `fixture_bom.received_quantity` for all PO types. |
| `deletePurchaseOrder` | `id: String!` | `Boolean!` | Delete purchase order by id. |

**Project Management & Design/BOM (module: project_management; requires `project_management` enabled. All require auth + entity-level permissions.)**

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `createProject` | `input: ProjectInput!` (name, projectNumber, customerId, description, status, startDate, targetDate, budget, purchaseBudget, designerTargetDate, procurementTargetDate, manufacturingTargetDate, qualityTargetDate, assemblyTargetDate, isActive) | `ProjectType` | Create project. `projectNumber` is the user-entered identifier (e.g. `S25049`); used as prefix for fixture and drawing numbers. All fields are required except those explicitly marked optional in `ProjectInput`. |
| `updateProject` | `id: String!`, `input: ProjectUpdateInput!` | `ProjectType` | **Partial update.** Update project by id. All fields in `ProjectUpdateInput` are optional; only fields provided in the input object are applied. `actualDeliveryDate` write is field-permission controlled. |
| `deleteProject` | `id: String!`, `softDelete: Boolean = true` | `Boolean!` | Soft/hard delete project by id. |
| `assignProjectPrincipal` | `input: ProjectAssignmentInput!` (projectId, principalType=`user\|role`, principalId, accessLevel) | `ProjectAssignmentType` | Assign project to a user or role. Requires `update` permission on `project_assignment`. |
| `removeProjectPrincipal` | `projectId: String!`, `principalType: String!`, `principalId: String!` | `Boolean!` | Remove a user/role assignment from project. Requires `update` permission on `project_assignment`. |
| `createFixture` | `input: CreateFixtureInput!` (projectId, description, status) | `FixtureType` | Create a fixture under a project. `fixtureNumber` and `fixtureSeq` are auto-generated from `project.projectNumber`. Requires `project.projectNumber` to be set. |
| `updateFixture` | `id: String!`, `input: UpdateFixtureInput!` (description, status, isActive) | `FixtureType` | Update fixture description, status, or active flag. |
| `deleteFixture` | `id: String!` | `Boolean!` | Hard delete a fixture and all its BOM parts. |
| `submitBomUpload` | `input: BomSubmitInput!` (fixtureId, s3Key, filename, wrongEntryResolutions?, productMatchResolutions?, quantityCorrections?) | `FixtureType` | **Fixture-level.** Commit a parsed BOM ZIP to a specific fixture. **First upload:** atomically replaces all BOM rows (delete-all + insert); stores SHA-256 hash of each drawing file in `drawing_file_hash`. **Re-upload (fixture already has BOM rows):** updates existing rows in-place — only manufactured rows in `pending` status are updated; non-pending rows are skipped. **Quantity preservation:** on re-upload, DB quantity is always preserved (parsed quantity is ignored); only explicit `quantityCorrections` from the user override it. **Drawing file detection:** drawing files are compared by SHA-256 hash; changed drawings are re-uploaded to S3 and the hash is updated. All field changes and drawing file changes are recorded in the audit log. New drawings or standard parts not already in the fixture are rejected with an error (must use a new fixture upload). Rows in DB not present in the upload are left untouched (partial re-upload is safe). Manufactured parts come from PDF drawings in unit directories; standard parts from BOM.xlsx. Uploads drawing files from ZIP to S3. Standard part resolution (first upload only): (1) `productMatchResolutions` UUID, (2) lookup by `item_code`, (3) skip if not found. `quantityCorrections`: list of `{drawingNo, qty}` — on first upload, overrides parsed qty; on re-upload, overrides DB qty (the only way to change quantity on re-upload). |
| `submitProjectBomUpload` | `input: ProjectBomSubmitInput!` (projectId, s3Key, filename, wrongEntryResolutions?, productMatchResolutions?, quantityCorrections?) | `[FixtureType!]!` | **Project-level (preferred).** Commit a parsed BOM ZIP to the project. Manufactured parts from PDF drawings, standard parts from BOM.xlsx. Fixtures are auto-created/matched from fixture sequences in drawing numbers. Duplicate drawings (already committed) are skipped. Same standard part resolution and `quantityCorrections` as `submitBomUpload`. Returns the list of affected fixtures. |
| `sendManufacturedToVendor` | `fixtureId: String!`, `partIds: [String!]!`, `vendorId: String!` | `EmailType` | Phase 3. Create an Email record + attachments snapshot (Excel + copied drawings) for selected manufactured parts, and sets `vendorId` on those parts. |
| `exportManufacturedPoExcel` | `fixtureId: String!`, `partIds: [String!]!` | `PoExcelExportType` | Phase 4. Export an **editable PO Excel template** from **`fixture_bom` row ids** (`partIds` = primary keys). Each id must belong to the fixture and have `part_type = manufactured`. Returns `s3Key` + `downloadUrl`. |
| `importManufacturedPoExcel` | `fixtureId: String!`, `s3Key: String!` | `ImportManufacturedPoResultType` | Phase 4. Import the edited PO Excel and update fields (pending-only). Rejects if any affected part has `status != pending`. Only overwrites non-empty cells. |
| `createManufacturedPo` | `fixtureId: String!`, `partIds: [String!]!`, `vendorId: String!` | `PurchaseOrderType` | Phase 4. Create a **`purchase_orders`** row (`poType = ManufacturedPart`, `projectId` auto-set from fixture) from **`fixture_bom` row ids** (`partIds`; each `part_type = manufactured`). Sets `vendorId` on rows and `status = inprogress` (pending-only). No Excel generated — user uploads their own attachment separately. |
| `updateManufacturedStatusBulk` | `fixtureId: String!`, `partIds: [String!]!`, `status: String!` | `Int!` | Phase 5. Bulk status update for manufactured parts in a **single fixture**. Allowed transitions only: `inprogress -> quality_checked`, `quality_checked -> received`. Returns number of updated parts. |
| `updateManufacturedQty` | `partId: String!`, `qty: Float!` | `BomManufacturedPartType` | Inline qty edit for a manufactured part. Allowed **only when `status = pending`**. Raises error if part not found or status is not pending. Requires `fixture_bom.update` permission. |
| `updateManufacturedReceivedQty` | `partId: String!`, `receivedQty: Float` | `BomManufacturedPartType` | Phase 5. Stock keeper updates received quantity on a BOM fixture (`fixture_bom.received_quantity`). Allowed only when current status is `quality_checked` or `received`. Requires `fixture_bom.update` permission. Module: `project_management`. |
| `updateStandardPartPurchaseUnitPrice` | `standardPartId: String!`, `purchaseUnitPrice: Float` | `FixtureProductType` | Phase 6. Inline edit: update `purchaseUnitPrice` for a **standard** row in unified table **`fixture_bom`** (`part_type = standard`). |
| `exportStandardPoExcel` | `fixtureId: String!`, `partIds: [String!]!` | `PoExcelExportType` | Phase 6. Export Standard Parts PO Excel from **`fixture_bom` row ids** (`partIds` = primary keys; each row must have `part_type = standard`). Excel includes: itemCode, description, make, unit, expectedQty, currentStock, purchaseQty (calculated), purchaseUnitPrice, supplierName. |
| `createStandardPo` | `fixtureId: String!`, `parts: [StandardPoPartInput!]!`, `supplierId: String!` | `PurchaseOrderType` | Phase 6. Create a **`purchase_orders`** row (`poType = StandardPart`, `projectId` auto-set from fixture). `parts` is a list of `{partId: String!, orderedQty: Float!}` where `partId` is the `fixture_bom` row id (`part_type = standard`) and `orderedQty` is the quantity being ordered in this PO. **Validation:** for each part, `sum(orderedQuantity across existing non-Completed POs) + orderedQty ≤ purchaseQty (= max(0, bom.quantity − product.quantity))` — raises error with part drawing number and amounts if exceeded. Stores `orderedQuantity` on each `PurchaseOrderLineItem`. Sets `supplierId` on the selected BOM rows. |
| `receiveStandardParts` | `receipts: [StandardPartReceiptInput!]!` (productId, receivedQty) | `Int!` | Phase 6. Store receiving: increments `products.quantity += receivedQty` for each receipt entry. Requires `product.update`. Returns number of updated products. |
| `markBomPartsReceived` | `items: [BomReceiveItemInput!]!` (fixtureBomId, receivedQty) | `Int!` | **BOM tree — Mark as Received.** Increments `fixture_bom.received_quantity` per item. For standard parts also increments `products.quantity`. **Validation:** `existing_received + receivedQty` must not exceed `fixture_bom.quantity` (ordered qty) — raises error with part name and amounts if exceeded. Requires `fixture_bom.update`. Returns count updated. |
| `collectByAssembly` | `collectedByUserId: String!`, `items: [CollectByAssemblyItemInput!]!` (fixtureBomId, collectedQuantity) | `CollectByAssemblyResultType` (`s3Key`, `downloadUrl`) | **Collected by Assembly** action. Increments `fixture_bom.collected_byassembly_quantity` (cumulative). **Validation:** `existing_collected + collectedQuantity` must not exceed `received_quantity` (manufactured parts) or `quantity` (standard parts) — raises error if exceeded. For standard parts decrements `products.quantity`. Generates Excel download URL with assembly user name. Requires `fixture_bom.update`. |
| `parseCostingExcel` | `poId: String!`, `fileBase64: String!`, `filename: String!` | `CostingPreviewType` | Step 1 of Costing flow. Accepts a base64-encoded XLSX in SHINEROBO Costing Master Sheet format. Reads the `Costing` sheet (headers in row 2, data from row 3). Columns used: `Drawing No.`, `Qty LH`, `Qty RH`, `Total cost`. Uploads the file to S3 under `costing/{poId}/...` and returns a preview of matched/unmatched rows — each row includes `qtyLh`, `qtyRh`, `quantityMismatch` (true when `Qty LH + Qty RH ≠ fixture_bom.quantity`). Requires `purchase_order.update`. |
| `confirmCosting` | `poId: String!`, `s3Key: String!` | `ConfirmCostingResultType` | Step 2 of Costing flow. Re-parses the XLSX from S3. Validates that `Qty LH + Qty RH == fixture_bom.quantity` for all matched drawings — raises an error listing all mismatches if any are found. If all quantities match, bulk-updates `fixture_bom.purchase_unit_price` from the `Total cost` column, appends the Excel as a `costing` attachment to the PO, sets `po_status = "CostingUpdated"` + `costing_updated_date = now()`, and **automatically sets `enable_costing = false`** to prevent further costing uploads. Returns `poId` + `updatedCount`. Requires `purchase_order.update`. |
| `exportBomViewExcel` | `fixtureId: String!`, `drawingNoContains: String`, `drawingDescriptionContains: String`, `standardPartItemCodeContains: String`, `standardPartNameContains: String`, `standardPartMakeContains: String`, `pendingDateFrom: DateTime`, `pendingDateTo: DateTime`, `inprogressDateFrom: DateTime`, `inprogressDateTo: DateTime`, `qcDateFrom: DateTime`, `qcDateTo: DateTime`, `receivedDateFrom: DateTime`, `receivedDateTo: DateTime` | `PoExcelExportType` | Export the current `bomView` dataset into an Excel file with **three sheets**: `Fixture Summary` (fixture metadata including `Assembly User ID`, `Assembly User`, `Assembly Received Quantity`), `Manufactured Parts`, and `Standard Parts`. Accepts the same filters as `bomView`. Returns `s3Key` + `downloadUrl`. |

**Pagination types:** All list queries return `{ items, total, skip, limit, page, totalPages, hasMore }`.

#### Sample queries (copy-paste)

```graphql
# 1. Hello (no auth)
query { hello }

# 2. Current user (requires Authorization: Bearer <token>)
query {
  currentUser {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}

# 3. Get single user by id (requires auth + user read permission)
query {
  user(userId: "USER_UUID") {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}

# 4. Users list (paginated, requires user read permission)
query {
  users(page: 1, pageSize: 10) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive
      roles { id name }
    }
    total skip limit page totalPages hasMore firstPage lastPage
  }
}

# 4b. Filter users by role
query {
  users(page: 1, pageSize: 100, roleId: "<role-uuid>") {
    items {
      id username email isActive
      roles { id name }
    }
    total hasMore
  }
}

# 5. Get roles (all roles or specific role by id)
# Get all roles:
query {
  getRoles {
    id name description
  }
}

# Get specific role:
query {
  getRoles(roleId: "ROLE_UUID") {
    id name description
  }
}

# 7. Get role with all permissions (replace roleId)
query {
  getRolePermissions(roleId: "ROLE_UUID") {
    role { id name description }
    entityPermissions { id entityName canCreate canRead canUpdate canDelete }
    fieldPermissions { id entityName fieldName canRead canWrite }
  }
}

# 8. My permissions (requires auth)
query { myPermissions { byRole } }

# 9. List all entities (requires auth + role read permission)
query {
  entities {
    name
    displayName
    description
  }
}

# 10. List fields for a specific entity (requires auth + role read permission)
query {
  entityFields(entityName: "user") {
    name
    displayName
    type
    description
  }
}

# 11. Get enum entities: key (entity_permissions) -> displayName (UI)
query {
  getEnumEntities { key displayName }
}

# 12. Get enum fields for an entity: key (field_permissions) -> displayName (UI)
query {
  getEnumFields(entityId: "user") { key displayName }
}
query {
  getEnumFields(entityId: "role") { key displayName }
}

# 13. Enabled modules (single source of truth for frontend module visibility)
query {
  enabledModules {
    moduleId
    enabled
    displayName
    description
  }
}

# ----- Master Data (require master_data module enabled) -----
# 14. Product categories list (page-based pagination)
# Optional: `nameContains`, `parentId` (exact parent category id)
query {
  productCategories(page: 1, pageSize: 50, isActive: true, nameContains: "Raw") {
    items { id categoryName parentId parentName isActive }
    total
    page
    totalPages
    hasMore
    firstPage
    lastPage
  }
}

# 15. Single product category
query {
  productCategory(id: "CATEGORY_UUID") {
    id categoryName parentId parentName isActive
  }
}

# 16. Customers list — page-based pagination + optional search (with audit fields)
query {
  customers(
    page: 1
    pageSize: 50
    isActive: true
    nameContains: "Acme"
    codeContains: null
    contactNameContains: null
    emailContains: null
  ) {
    items {
      id name code address contactInfo
      primaryContactName primaryContactEmail primaryContactMobile
      secondaryContactName secondaryContactEmail secondaryContactMobile
      isActive createdAt modifiedAt createdBy createdByUsername modifiedBy modifiedByUsername
    }
    total
    page
    totalPages
    hasMore
    firstPage
    lastPage
  }
}

# 16b. Get single customer by id (GetCustomer)
query GetCustomer($id: String!) {
  customer(id: $id) {
    id name code address contactInfo
    primaryContactName primaryContactEmail primaryContactMobile
    secondaryContactName secondaryContactEmail secondaryContactMobile
    isActive createdAt modifiedAt createdBy createdByUsername modifiedBy modifiedByUsername
  }
}
# Variables: { "id": "CUSTOMER_UUID" }

# 17. Products list — all optional filters
# Text filters: case-insensitive "contains" match
# puUnitId / stkUnitId: exact UOM id match
query ListProducts(
  $page: Int
  $pageSize: Int
  $categoryId: String
  $isActive: Boolean
  $itemCodeContains: String
  $nameContains: String
  $descriptionContains: String
  $makeContains: String
  $puUnitId: String
  $stkUnitId: String
  $locationInStoreContains: String
) {
  products(
    page: $page
    pageSize: $pageSize
    categoryId: $categoryId
    isActive: $isActive
    itemCodeContains: $itemCodeContains
    nameContains: $nameContains
    descriptionContains: $descriptionContains
    makeContains: $makeContains
    puUnitId: $puUnitId
    stkUnitId: $stkUnitId
    locationInStoreContains: $locationInStoreContains
  ) {
    items {
      id itemCode name description make
      puUnitId stkUnitId puUnitName stkUnitName
      procMtd locationInStore quantity isActive categoryId
    }
    total skip limit page totalPages hasMore firstPage lastPage
  }
}
# Example — find all auto-created SRBOP products:
# { "page": 1, "pageSize": 50, "itemCodeContains": "SRBOP", "isActive": true }
#
# Example — find by make:
# { "page": 1, "pageSize": 20, "makeContains": "SMC" }
#
# Example — find by stock unit:
# { "page": 1, "pageSize": 100, "stkUnitId": "UOM_UUID" }

# 17b. Purchase Orders list — page-based pagination + optional search
# poNumberContains: case-insensitive partial match on PO number (searches across ALL pages)
# titleContains: filter by PO title
# poStatusContains: filter by status (e.g. "Created", "CostingUpdated", "Completed")
query ListPurchaseOrders(
  $page: Int
  $pageSize: Int
  $isActive: Boolean
  $poNumberContains: String
  $titleContains: String
  $poStatusContains: String
) {
  purchaseOrders(
    page: $page
    pageSize: $pageSize
    isActive: $isActive
    poNumberContains: $poNumberContains
    titleContains: $titleContains
    poStatusContains: $poStatusContains
  ) {
    items {
      id poNumber title poType poStatus enableCosting
      vendorId vendorName supplierId supplierName
      projectId projectName fixtureId
      poSendDate costingUpdatedDate completedDate
      isActive createdAt modifiedAt createdBy modifiedBy
    }
    total page totalPages hasMore firstPage lastPage
  }
}
# Example — search by PO number fragment across all pages:
# { "page": 1, "pageSize": 20, "poNumberContains": "PO250101" }
#
# Example — list only completed POs:
# { "page": 1, "pageSize": 20, "poStatusContains": "Completed" }
#
# Example — search by title:
# { "page": 1, "pageSize": 20, "titleContains": "Acme fixture" }

# ----- Project Management & Design/BOM (require project_management module enabled) -----
# 18. Projects list
query {
  projects(skip: 0, limit: 50, isActive: true) {
    items {
      id projectNumber name customerId customerName status isActive remainingDays
      startDate targetDate budget
    }
    total page totalPages hasMore
  }
}

# 19. Single project
query {
  project(id: "PROJECT_UUID") {
    id projectNumber name customerId customerName description status
    startDate targetDate actualDeliveryDate budget purchaseBudget isActive remainingDays
    designerTargetDate procurementTargetDate manufacturingTargetDate qualityTargetDate assemblyTargetDate
    createdAt createdByUsername modifiedAt modifiedByUsername
  }
}

# 20. Fixtures list (optionally filtered by project)
query {
  fixtures(projectId: "PROJECT_UUID", isActive: true) {
    items {
      id projectId fixtureNumber fixtureSeq description status
      s3BomKey bomFilename bomUploadedAt isActive
    }
    total
  }
}

# 21. Single fixture
query {
  fixture(id: "FIXTURE_UUID") {
    id projectId fixtureNumber fixtureSeq description status
    s3BomKey bomFilename bomUploadedAt bomUploadedBy isActive
    assemblyUserId assemblyUserName assemblyReceivedQuantity
    createdAt createdByUsername
  }
}

# 22. BOM view (full committed BOM for a fixture, with optional search filters)
query BomView(
  $fixtureId: String!,
  $drawingNo: String,
  $drawingDesc: String,
  $stdItemCode: String,
  $stdName: String,
  $stdMake: String,
  # Status date range filters (manufactured parts only; both bounds inclusive)
  $pendingDateFrom: DateTime,
  $pendingDateTo: DateTime,
  $inprogressDateFrom: DateTime,
  $inprogressDateTo: DateTime,
  $qcDateFrom: DateTime,
  $qcDateTo: DateTime,
  $receivedDateFrom: DateTime,
  $receivedDateTo: DateTime
) {
  bomView(
    fixtureId: $fixtureId
    drawingNoContains: $drawingNo
    drawingDescriptionContains: $drawingDesc
    standardPartItemCodeContains: $stdItemCode
    standardPartNameContains: $stdName
    standardPartMakeContains: $stdMake
    pendingDateFrom: $pendingDateFrom
    pendingDateTo: $pendingDateTo
    inprogressDateFrom: $inprogressDateFrom
    inprogressDateTo: $inprogressDateTo
    qcDateFrom: $qcDateFrom
    qcDateTo: $qcDateTo
    receivedDateFrom: $receivedDateFrom
    receivedDateTo: $receivedDateTo
  ) {
    fixture { id fixtureNumber status bomUploadedAt assemblyUserId assemblyUserName assemblyReceivedQuantity }
    manufacturedParts {
      id fixtureId srNo drawingNo description qtyLh qtyRh status
      vendorId vendorName receivedLhQty receivedRhQty
      fixtureSeq unitSeq partSeq drawingFileS3Key
      pendingAt inprogressAt qualityCheckedAt receivedAt
    }
    standardParts {
      id fixtureId productId srNo unitId supplierId supplierName
      itemCode      # Product.itemCode
      productName productMake
      uom           # Product master UOM code (stk unit, else pu unit)
      qty           # expected quantity from BOM line item
      currentStock  # Product.quantity from product master
      purchaseQty   # max(0, qty - currentStock) — how many to procure
      purchaseUnitPrice
    }
  }
}
# Example variables:
# {
#   "fixtureId": "FIXTURE_UUID",
#   "drawingNo": "S25049001",
#   "drawingDesc": null,
#   "stdItemCode": "ISO-4762",
#   "stdName": null,
#   "stdMake": "Unbrako"
# }
#
# Manufactured part status values:
# - pending (default on BOM submit)
# - inprogress
# - quality_checked
# - received

# 23. Get presigned upload URL (before submitting BOM)
query {
  getDesignUploadUrl(fixtureId: "FIXTURE_UUID", filename: "BOM.zip") {
    uploadUrl
    s3Key
    fixtureId
  }
}

# 24. Parse BOM file preview (after PUT to uploadUrl)
# On re-upload (fixture already has BOM rows), each row gets diff annotations:
#   changeStatus: "changed" | "unchanged" | "new" | null (first upload)
#   changes: [{field, oldValue, newValue}]  — only when changeStatus="changed"
#     field can be: "description", "quantity", "lhRh", "drawingFile"
#   existingStatus: current DB status (manufactured only, e.g. "pending", "sent_to_vendor")
#   existingRowId: DB row UUID
#   drawingFileChanged: true when drawing PDF content (SHA-256) differs from stored version
#
# Quantity diff is informational only — DB qty is preserved on submit.
# User must use quantityCorrections to explicitly change quantity.
#
# UI should show only changeStatus="changed" rows in the diff popup.
# Rows with changeStatus="new" are errors — new drawings require a new fixture upload.
# Rows with existingStatus != "pending" cannot be updated (notUpdatableCount in summary).
query {
  parseBomFile(fixtureId: "FIXTURE_UUID", s3Key: "bom-uploads/...") {
    manufacturedParts {
      drawingNo description qty lhRh
      isWrongEntry wrongEntryReason
      fixtureSeq unitSeq partSeq parsedDrawingNo hasDrawing
      isDuplicateInProject
      duplicateFixtures { id fixtureNumber qty }
      source  # "pdf" (from drawing PDF) or "excel" (from BOM.xlsx)
      changeStatus       # null on first upload; "changed"/"unchanged"/"new" on re-upload
      changes { field oldValue newValue }  # field-level diffs when changeStatus="changed"
      existingStatus     # current DB row status (manufactured only)
      existingRowId      # DB row UUID for targeted update
      existingQty        # current quantity in DB (null on first upload)
      drawingFileChanged # true when drawing PDF content changed (SHA-256 hash differs)
    }
    standardParts {
      drawingNo itemCode description qty lhRh uom
      productFound productId
      isWrongEntry wrongEntryReason
      fixtureSeq unitSeq
      changeStatus
      changes { field oldValue newValue }
      existingRowId
      existingQty        # current quantity in DB (null on first upload)
    }
    wrongEntries { rowNum rawValue reason }
    errors { rowNum rawValue reason }  # Excel rows with no PDF directory (blocking — excluded from manufacturedParts)
    warnings {                         # PDF-only drawings not in Excel (non-blocking — included using PDF values)
      drawingNo
      description  # PDF-parsed description
      qty          # PDF-parsed qty
      note         # "Drawing found in ZIP but not listed in BOM Excel; using PDF-parsed values"
    }
    summary {
      totalManufactured totalStandard wrongEntryCount
      errorCount warningCount
      changedCount unchangedCount newCount notUpdatableCount
    }
  }
}

# 25. Get drawing view URL (presigned GET for a manufactured part's drawing)
query {
  getDrawingViewUrl(partId: "PART_UUID") {
    viewUrl
    partId
    drawingNo
  }
}

# 26. Project-level BOM upload URL (no fixture needed)
query GetProjectBomUploadUrl($projectId: String!, $filename: String!) {
  getProjectBomUploadUrl(projectId: $projectId, filename: $filename) {
    uploadUrl s3Key projectId
  }
}
# Variables: { "projectId": "PROJECT_UUID", "filename": "BOM.zip" }

# 27. Project-level parse BOM (Excel=source of truth; PDF directories validate existence)
query ParseProjectBomFile($projectId: String!, $s3Key: String!) {
  parseProjectBomFile(projectId: $projectId, s3Key: $s3Key) {
    summary {
      totalManufactured totalStandard wrongEntryCount
      bomFixtureSeq fixtureMismatchCount
      duplicateDrawingCount newFixtureSeqs existingFixtureSeqs
    }
    manufacturedParts {
      drawingNo description qty lhRh
      isWrongEntry wrongEntryReason
      fixtureSeq unitSeq partSeq parsedDrawingNo hasDrawing
      isDuplicateInProject duplicateFixtures { id fixtureNumber qty }
      fixtureExists existingFixtureId existingFixtureNumber
      source  # always "pdf" (validated from PDF directory in ZIP)
    }
    standardParts {
      drawingNo itemCode description qty lhRh uom
      productFound productId
      isWrongEntry wrongEntryReason
      fixtureSeq unitSeq
    }
    wrongEntries { rowNum rawValue reason }
    errors { rowNum rawValue reason }  # Excel manufactured rows without PDF directory (blocking)
    warnings {                         # PDF-only drawings not in Excel (non-blocking)
      drawingNo
      description  # PDF-parsed description
      qty          # PDF-parsed qty
      note
    }
    summary {
      totalManufactured totalStandard wrongEntryCount
      errorCount warningCount
      bomFixtureSeq fixtureMismatchCount
      duplicateDrawingCount newFixtureSeqs existingFixtureSeqs
    }
  }
}
# Variables: { "projectId": "PROJECT_UUID", "s3Key": "bom-uploads/projects/..." }
```

#### Sample mutations (copy-paste)

```graphql
# 1. Login (username + password; returns tokens and user)
mutation {
  login(username: "superadmin", password: "superadmin123") {
    accessToken
    refreshToken
    tokenType
    user {
      id
      firstName
      lastName
      username
      email
      isActive
    }
    permissions { byRole }
  }
}

# 2. Refresh access token
mutation {
  refresh(refreshToken: "YOUR_REFRESH_TOKEN") {
    accessToken
    tokenType
  }
}

# 3. Create user (optional: dateOfBirth, mobileNumber, email)
mutation {
  createUser(
    firstName: "Jane"
    lastName: "Doe"
    username: "jane.doe"
    password: "secret123"
    email: "jane@example.com"
  ) {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}

# 4. Update user (all user fields except username/password; optional except userId)
mutation {
  updateUser(userId: "USER_UUID", firstName: "Jane", isActive: true) {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}

# 5. Change my password (requires auth)
mutation {
  changePassword(currentPassword: "old_secret", newPassword: "new_secret123")
}

# 6. Set another user's password (admin; requires auth + user update permission)
mutation {
  setUserPassword(userId: "USER_UUID", newPassword: "new_secret123")
}

# 7. Delete user (requires auth + delete permission)
mutation {
  deleteUser(userId: "USER_UUID")
}

# 8. Delete role (requires auth + delete permission on role; only `superadmin` cannot be deleted)
mutation {
  deleteRole(roleId: "ROLE_UUID")
}

# 9. Add role to user (requires auth + user update permission)
mutation {
  addUserRole(userId: "USER_UUID", roleId: "ROLE_UUID") {
    id firstName lastName username email isActive roles
  }
}

# 10. Remove role from user (requires auth + user update permission)
mutation {
  removeUserRole(userId: "USER_UUID", roleId: "ROLE_UUID") {
    id firstName lastName username email isActive roles
  }
}

# 11. Upsert role with permissions (create or update role + all permissions in one transaction)
# Create new role (roleId is null):
mutation {
  upsertRoleWithPermissions(
    name: "custom_role"
    description: "Custom role description"
    entityPermissions: [
      {
        entityName: "user"
        canCreate: true
        canRead: true
        canUpdate: true
        canDelete: false
      }
    ]
    fieldPermissions: [
      {
        entityName: "user"
        fieldName: "email"
        canRead: true
        canWrite: true
      }
      {
        entityName: "user"
        fieldName: "username"
        canRead: true
        canWrite: false
      }
    ]
  ) {
    role { id name description }
    entityPermissions { id entityName canCreate canRead canUpdate canDelete }
    fieldPermissions { id entityName fieldName canRead canWrite }
  }
}

# Update existing role (provide roleId):
mutation {
  upsertRoleWithPermissions(
    roleId: "ROLE_UUID"
    name: "updated_role_name"
    description: "Updated description"
    entityPermissions: [
      {
        entityName: "user"
        canCreate: true
        canRead: true
        canUpdate: true
        canDelete: true
      }
    ]
    fieldPermissions: [
      {
        entityName: "user"
        fieldName: "email"
        canRead: true
        canWrite: true
      }
    ]
  ) {
    role { id name description }
    entityPermissions { id entityName canCreate canRead canUpdate canDelete }
    fieldPermissions { id entityName fieldName canRead canWrite }
  }
}

# 12. Set module enabled (core; requires role update permission)
mutation {
  setModuleEnabled(moduleId: "master_data", enabled: true) {
    moduleId
    enabled
    displayName
    description
  }
}

# ----- Master Data (require master_data module enabled) -----
# 13. Create product category
mutation {
  createProductCategory(input: { categoryName: "Electronics", parentId: null, isActive: true }) {
    id categoryName parentId parentName isActive
  }
}

# 14. Update product category
mutation {
  updateProductCategory(id: "CATEGORY_UUID", input: { categoryName: "Consumer Electronics", parentId: null, isActive: true }) {
    id categoryName parentId parentName isActive
  }
}

# 15. Create customer
mutation {
  createCustomer(input: {
    name: "Acme Corp"
    code: "ACME"
    address: "123 Main St"
    primaryContactName: "John Doe"
    primaryContactEmail: "john@acme.com"
    primaryContactMobile: "+1234567890"
    secondaryContactName: "Jane Doe"
    secondaryContactEmail: "jane@acme.com"
    secondaryContactMobile: "+0987654321"
    isActive: true
  }) {
    id name code primaryContactName primaryContactEmail primaryContactMobile
    secondaryContactName secondaryContactEmail secondaryContactMobile
  }
}

# 16. Create product
mutation {
  createProduct(input: {
    name: "Widget A"
    categoryId: "CATEGORY_UUID"
    itemCode: "WGT-001"
    puUnitId: "UOM_UUID"
    stkUnitId: "UOM_UUID"
    isActive: true
  }) {
    id name categoryId itemCode description make puUnitId stkUnitId puUnitName stkUnitName quantity isActive
  }
}

# ----- Project Management & Design/BOM (require project_management module enabled) -----
# 17. Create project
mutation {
  createProject(input: {
    name: "Hydraulic Fixture 2026"
    projectNumber: "S25049"
    customerId: "CUSTOMER_UUID"
    status: "open"
    startDate: "2026-01-01"
    targetDate: "2026-12-31"
    budget: 500000.00
    isActive: true
  }) {
    id projectNumber name status isActive
    createdAt createdByUsername
  }
}

# 18. Update project
mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) {
  updateProject(id: $id, input: $input) {
    id projectNumber name status procurementTargetDate
  }
}
# Variables:
# {
#   "id": "PROJECT_UUID",
#   "input": {
#     "status": "in_progress",
#     "procurementTargetDate": "2026-06-01"
#   }
# }

# 19. Delete project (soft delete by default)
mutation {
  deleteProject(id: "PROJECT_UUID", softDelete: true)
}

# 20. Create fixture (requires project to have projectNumber set)
mutation {
  createFixture(input: {
    projectId: "PROJECT_UUID"
    description: "Main body fixture"
    status: "design_pending"
  }) {
    id projectId fixtureNumber fixtureSeq description status isActive
  }
}

# 21. Update fixture
mutation {
  updateFixture(id: "FIXTURE_UUID", input: {
    description: "Updated description"
    status: "design_complete"
    isActive: true
  }) {
    id fixtureNumber description status isActive
  }
}

# 22. Delete fixture
mutation {
  deleteFixture(id: "FIXTURE_UUID")
}

# 23. Submit BOM upload (after parseBomFile preview)
# Step 1: getDesignUploadUrl → get uploadUrl + s3Key
# Step 2: PUT file bytes to uploadUrl
# Step 3: parseBomFile → review manufactured parts (Excel as source of truth, validated by PDF directory)
#         Warnings = PDF-only drawings not in Excel (non-blocking); Errors = Excel rows with no PDF (blocking)
#         On re-upload: review changeStatus/changes diff; only "changed" rows with "pending" status will be updated
# Step 4: submitBomUpload with optional resolutions and quantity corrections
#
# First upload: delete-all + insert (original behaviour). Resolutions apply. Drawing file SHA-256 hashes are stored.
# Re-upload (fixture already has BOM rows): update-in-place for matched rows only.
#   - DB quantity is always preserved; only explicit quantityCorrections override it.
#   - Drawing files are compared by SHA-256 hash; changed drawings are re-uploaded to S3.
#   - Manufactured rows must be in "pending" status to be updated; non-pending are skipped.
#   - New drawings/standard parts not in the fixture are rejected (use new fixture upload).
#   - Rows in DB not in the upload are left untouched (partial re-upload is safe).
#   - wrongEntryResolutions and productMatchResolutions are ignored on re-upload.
#   - All changes (field updates + drawing file changes) are recorded in the audit log.
#
# Standard part resolution (first upload): (1) productMatchResolutions UUID, (2) lookup by item_code, (3) skip if not found
# quantityCorrections: on first upload, overrides parsed qty; on re-upload, overrides DB qty (only way to change qty)
mutation {
  submitBomUpload(input: {
    fixtureId: "FIXTURE_UUID"
    s3Key: "bom-uploads/FIXTURE_UUID/BOM.zip"
    filename: "BOM.zip"
    # wrongEntryResolutions is optional — omit to skip all wrong entries (first upload only)
    wrongEntryResolutions: [
      {
        originalDrawingNo: "20x46 LG"
        action: "skip"
      }
    ]
    # productMatchResolutions is optional — omit for full auto-resolve (first upload only)
    productMatchResolutions: [
      {
        itemCode: "MGPM63-25Z"
        productId: "EXISTING_PRODUCT_UUID"
      }
    ]
    # quantityCorrections is optional — works on both first upload and re-upload
    quantityCorrections: [
      { drawingNo: "S250490010402", qty: 2 }
      { drawingNo: "S250490010702", qty: 1 }
    ]
  }) {
    id fixtureNumber status s3BomKey bomFilename bomUploadedAt
  }
}

# 24. Project-level BOM submit (preferred for UI "Upload BOM" on a project row)
# Step 1: getProjectBomUploadUrl → get uploadUrl + s3Key (project-scoped, no fixture needed)
# Step 2: PUT file bytes to uploadUrl
# Step 3: parseProjectBomFile → review (Excel=source of truth for desc/qty/lhRh,
#         PDF directories validate existence; fixture IDs derived from drawing numbers, duplicates flagged)
#         Warnings = PDF-only drawings not in Excel; Errors = Excel rows with no PDF directory
# Step 4: submitProjectBomUpload → auto-creates missing fixtures, skips duplicate drawings
mutation SubmitProjectBomUpload($input: ProjectBomSubmitInput!) {
  submitProjectBomUpload(input: $input) {
    id fixtureNumber fixtureSeq status s3BomKey bomFilename bomUploadedAt
  }
}
# Variables:
# {
#   "input": {
#     "projectId": "PROJECT_UUID",
#     "s3Key": "bom-uploads/projects/PROJECT_UUID/BOM.zip",
#     "filename": "BOM.zip",
#     "wrongEntryResolutions": [
#       { "originalDrawingNo": "20x46 LG", "action": "skip" }
#     ],
#     "quantityCorrections": [
#       { "drawingNo": "S250490010402", "qty": 2 },
#       { "drawingNo": "S250490010702", "qty": 1 }
#     ]
#   }
# }
```

# 25a. Update manufactured part qty inline (allowed only when status = pending)
mutation UpdateManufacturedQty($partId: String!, $qty: Float!) {
  updateManufacturedQty(partId: $partId, qty: $qty) {
    id drawingNo qty status fixtureId
  }
}
# Variables: { "partId": "BOM_PART_UUID", "qty": 3 }
# Error if status != pending: "Quantity can only be updated when status is pending"

# 26. List stored emails (for debugging/audit)
query ListEmails {
  emails(contextType: "manufacturing_vendor", contextId: "FIXTURE_UUID") {
    id
    subject
    toAddress
    contextType
    contextId
    attachments
    createdAt
  }
}

# 25a. Query existing Standard Part POs for a fixture (used in Create PO popup)
# Pass partIds = IDs of selected rows (where orderQty > 0 from standardPartsForPo).
# Only POs containing at least one of those item codes are returned.
# If no PO exists for any of the selected items, returns an empty list.
query PurchaseOrdersByFixture($fixtureId: String!, $partIds: [String!]) {
  purchaseOrdersByFixture(fixtureId: $fixtureId, poType: "StandardPart", partIds: $partIds) {
    id
    poNumber
    poStatus
    supplierName
    createdAt
    lineItems {
      fixtureBomId
      orderedQuantity # qty ordered in THIS PO for this line item
    }
  }
}
# Variables example:
# { "fixtureId": "abc123", "partIds": ["bom-row-id-1", "bom-row-id-2"] }

# 25a-2. Query standard parts for PO popup
# openOrderQty = total ordered on non-Completed open POs for this part.
# orderQty     = auto-calculated order qty for this PO (read-only, not editable by user).
# Call on popup open AND again just before submit to ensure freshness.
# Rows with orderQty <= 0 should be shown as red and skipped from PO creation.
query StandardPartsForPo($fixtureId: String!) {
  standardPartsForPo(fixtureId: $fixtureId) {
    id              # fixture BOM row id — use as partId in createStandardPo
    itemCode
    productName
    productMake
    uom
    lhRh
    expectedQty     # BOM quantity
    currentStock    # latest from Product master
    openOrderQty    # total ordered on existing non-Completed POs
    orderQty        # max(0, expectedQty - currentStock - openOrderQty) — auto-calculated, read-only
    purchaseUnitPrice
    supplierId
    supplierName
  }
}

# 25b. Create a Standard Part PO with orderedQty per part (breaking change from old partIds signature)
# orderedQty must satisfy: sum(existing non-Completed PO orderedQty for part) + orderedQty <= purchaseQty
# purchaseQty = max(0, bom.quantity - product.quantity)
mutation CreateStandardPo(
  $fixtureId: String!
  $parts: [StandardPoPartInput!]!
  $supplierId: String!
) {
  createStandardPo(fixtureId: $fixtureId, parts: $parts, supplierId: $supplierId) {
    id
    poNumber
    poType
    poStatus
    supplierId
    lineItems {
      fixtureBomId
      orderedQuantity
    }
  }
}
# Variables:
# {
#   "fixtureId": "FIXTURE_UUID",
#   "parts": [
#     { "partId": "FIXTURE_BOM_ROW_UUID_1", "orderedQty": 4 },
#     { "partId": "FIXTURE_BOM_ROW_UUID_2", "orderedQty": 2 }
#   ],
#   "supplierId": "SUPPLIER_UUID"
# }

# 25. Create an email record (no real send yet)
mutation CreateEmail($input: CreateEmailInput!) {
  createEmail(input: $input) {
    id
    subject
    toAddress
    ccAddress
    bccAddress
    attachments
    contextType
    contextId
    createdAt
  }
}
# Variables:
# {
#   "input": {
#     "subject": "PO for manufactured parts",
#     "body": "Please find attached the PO.",
#     "toAddress": "vendor@example.com",
#     "ccAddress": null,
#     "bccAddress": null,
#     "attachments": [
#       { "s3Key": "emails/po-123.xlsx", "filename": "PO.xlsx" }
#     ],
#     "contextType": "manufacturing_po",
#     "contextId": "FIXTURE_UUID"
#   }
# }

---

## Queries

### Query: `hello`

**Test field to verify GraphQL is working.**

```graphql
query {
  hello
}
```

**Response:**
```json
{
  "data": {
    "hello": "Hello from GraphQL! Use introspection to discover the schema."
  }
}
```

---

### Query: `currentUser`

**Get the currently authenticated user.**

```graphql
query {
  currentUser {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}
```

**Response:**
```json
{
  "data": {
    "currentUser": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "firstName": null,
      "lastName": null,
      "dateOfBirth": null,
      "mobileNumber": null,
      "username": "admin",
      "email": "admin@example.com",
      "isActive": true,
      "roles": ["admin"]
    }
  }
}
```

---

### Query: `user`

**Get a single user by id. Requires read permission on user entity.**

```graphql
query {
  user(userId: "5bb8960d-f04d-41ce-8f12-a000b5f2dc11") {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": "5bb8960d-f04d-41ce-8f12-a000b5f2dc11",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "mobileNumber": "+1234567890",
      "username": "john.doe",
      "email": "john@example.com",
      "isActive": true,
      "roles": ["employee"]
    }
  }
}
```

**Returns `null` if:**
- User not authenticated
- User not found
- User doesn't have read permission on `user` entity

---

### Query: `users` (Paginated)

**List users with pagination. Requires read permission on users entity.**

`roles` on each user is now `[UserRoleType]` — each role has `id` and `name`. Use `roleId` to filter the list to users assigned to a specific role.

**Basic Query:**
```graphql
query {
  users(page: 1, pageSize: 10) {
    items {
      id
      firstName
      lastName
      dateOfBirth
      mobileNumber
      username
      email
      isActive
      roles { id name }
    }
    total
    skip
    limit
    page
    totalPages
    hasMore
    firstPage
    lastPage
  }
}
```

**Response:**
```json
{
  "data": {
    "users": {
      "items": [
        {
          "id": "user-1",
          "firstName": "Admin",
          "lastName": null,
          "dateOfBirth": null,
          "mobileNumber": null,
          "username": "admin",
          "email": "admin@example.com",
          "isActive": true,
          "roles": [{ "id": "role-uuid", "name": "admin" }]
        },
        {
          "id": "user-2",
          "firstName": null,
          "lastName": null,
          "dateOfBirth": null,
          "mobileNumber": null,
          "username": "manager",
          "email": "manager@example.com",
          "isActive": true,
          "roles": [{ "id": "role-uuid-2", "name": "manager" }]
        }
      ],
      "total": 3,
      "skip": 0,
      "limit": 10,
      "page": 1,
      "totalPages": 1,
      "hasMore": false,
      "firstPage": 1,
      "lastPage": 1
    }
  }
}
```

**Filter by role:**
```graphql
query {
  users(page: 1, pageSize: 100, roleId: "<role-uuid>") {
    items {
      id username email isActive
      roles { id name }
    }
    total hasMore
  }
}
```

**Pagination Parameters:**
- `page`: 1-indexed page number (default: 1)
- `pageSize`: Items per page (default: 20, max: 200)
- `roleId` *(optional)*: Filter to users assigned to this role ID

**Get all users (up to max page size):**
```graphql
query {
  users(page: 1, pageSize: 200) {
    items {
      id
      firstName
      lastName
      dateOfBirth
      mobileNumber
      username
      email
      isActive
      roles { id name }
    }
    total
    hasMore
    firstPage
    lastPage
  }
}
```

---

### Query: `myPermissions`

**Get current user's permissions grouped by role (no separate roles field). Same shape as `login.permissions.byRole`.**

```graphql
query {
  myPermissions {
    byRole
  }
}
```

**Response:** Permissions are keyed by role name. Each role has entity names as keys, each entity has `create`, `read`, `update`, `delete`, and `fields` (field name → `{ read, write }`).

```json
{
  "data": {
    "myPermissions": {
      "byRole": {
        "superadmin": {
          "user": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true,
            "fields": {
              "id": {"read": true, "write": false},
              "email": {"read": true, "write": true},
              "is_active": {"read": true, "write": true}
            }
          },
          "role": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true,
            "fields": {
              "id": {"read": true, "write": false},
              "name": {"read": true, "write": true},
              "description": {"read": true, "write": true}
            }
          }
        }
      }
    }
  }
}
```

**Frontend note:** If the user has multiple roles, merge with OR logic (e.g. allow if any role grants the permission), or use a single primary role depending on your UX.

---

### Query: `getRoles`

**Get roles. If `roleId` is provided, returns that specific role. Otherwise returns all roles (just role table rows with all fields). Requires read permission on `role` entity.**

**Get all roles:**
```graphql
query {
  getRoles {
    id
    name
    description
  }
}
```

**Get specific role by id:**
```graphql
query {
  getRoles(roleId: "role-002") {
    id
    name
    description
  }
}
```

**Response (all roles):**
```json
{
  "data": {
    "getRoles": [
      {
        "id": "role-001",
        "name": "superadmin",
        "description": "Super administrator with all permissions"
      },
      {
        "id": "role-002",
        "name": "admin",
        "description": "Full access to everything"
      },
      {
        "id": "role-003",
        "name": "manager",
        "description": "Manager role"
      }
    ]
  }
}
```

**Response (specific role):**
```json
{
  "data": {
    "getRoles": [
      {
        "id": "role-002",
        "name": "admin",
        "description": "Full access to everything"
      }
    ]
  }
}
```

**Returns empty array `[]` if:**
- User not authenticated
- User doesn't have read permission on `role` entity
- Specific roleId provided but role not found

**Notes:**
- Returns just role table rows (id, name, description) - no permissions included
- Use `getRolePermissions` if you need role with all its permissions

---

### Query: `getRolePermissions`

**Get role with all its entity and field permissions. Requires read permission on `role` entity.**

```graphql
query {
  getRolePermissions(roleId: "role-002") {
    role {
      id
      name
      description
    }
    entityPermissions {
      id
      entityName
      canCreate
      canRead
      canUpdate
      canDelete
    }
    fieldPermissions {
      id
      entityName
      fieldName
      canRead
      canWrite
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "getRolePermissions": {
      "role": {
        "id": "role-002",
        "name": "admin",
        "description": "Full access to everything"
      },
      "entityPermissions": [
        {
          "id": "perm-001",
          "entityName": "user",
          "canCreate": true,
          "canRead": true,
          "canUpdate": true,
          "canDelete": false
        },
        {
          "id": "perm-002",
          "entityName": "role",
          "canCreate": false,
          "canRead": true,
          "canUpdate": false,
          "canDelete": false
        }
      ],
      "fieldPermissions": [
        {
          "id": "fperm-001",
          "entityName": "user",
          "fieldName": "email",
          "canRead": true,
          "canWrite": true
        },
        {
          "id": "fperm-002",
          "entityName": "user",
          "fieldName": "username",
          "canRead": true,
          "canWrite": false
        }
      ]
    }
  }
}
```

**Returns `null` if:**
- User not authenticated
- Role not found
- User doesn't have read permission on `role` entity

---

### Query: `entities`

**List all entities that have permissions configured in the system. Returns distinct entity names from both entity_permissions and field_permissions tables. Requires read permission on `role` entity.**

```graphql
query {
  entities {
    name
    displayName
    description
  }
}
```

**Response:**
```json
{
  "data": {
    "entities": [
      {
        "name": "role",
        "displayName": "Role",
        "description": "Role management entity"
      },
      {
        "name": "user",
        "displayName": "User",
        "description": "User management entity"
      }
    ]
  }
}
```

**Returns empty array `[]` if:**
- User not authenticated
- User doesn't have read permission on `role` entity

**Notes:**
- Returns ALL entities from **ORM discovery** (same entity keys as `getEnumEntities`), not just those with permissions
- Works even on day one when no permissions exist - perfect for UI dropdowns!
- Entities are sorted alphabetically
- `displayName` and `description` come from the master registry configuration

---

### Query: `entityFields`

**List ALL fields for a given entity that CAN have permissions configured. Uses SQLAlchemy model introspection to discover fields from the entity's model. This works even when no permissions are configured yet. Requires read permission on `role` entity.**

```graphql
query {
  entityFields(entityName: "user") {
    name
    displayName
    type
    description
  }
}
```

**Response:**
```json
{
  "data": {
    "entityFields": [
      {
        "name": "date_of_birth",
        "displayName": null,
        "type": "Date",
        "description": null
      },
      {
        "name": "email",
        "displayName": null,
        "type": "String",
        "description": null
      },
      {
        "name": "first_name",
        "displayName": null,
        "type": "String",
        "description": null
      },
      {
        "name": "id",
        "displayName": null,
        "type": "String",
        "description": null
      },
      {
        "name": "is_active",
        "displayName": null,
        "type": "Boolean",
        "description": null
      },
      {
        "name": "last_name",
        "displayName": null,
        "type": "String",
        "description": null
      },
      {
        "name": "mobile_number",
        "displayName": null,
        "type": "String",
        "description": null
      },
      {
        "name": "username",
        "displayName": null,
        "type": "String",
        "description": null
      }
    ]
  }
}
```

**Returns empty array `[]` if:**
- User not authenticated
- User doesn't have read permission on `role` entity
- Entity name doesn't exist in master registry

**Notes:**
- Returns ALL fields from the entity's SQLAlchemy model via model introspection
- Works even on day one when no permissions exist - perfect for UI field selection!
- Fields are discovered automatically from models - no manual field list maintenance needed
- `type` shows the GraphQL type (String, Int, Boolean, Date, etc.)
- `displayName` and `description` are optional fields for future enhancement (currently `null`)

---

## Mutations

### Mutation: `login`

**Authenticate user and get access/refresh tokens plus permissions by role. User object has no `roles` field; role names are the keys of `permissions.byRole`.**

```graphql
mutation {
  login(username: "superadmin", password: "superadmin123") {
    accessToken
    refreshToken
    tokenType
    user {
      id
      username
      email
      isActive
    }
    permissions {
      byRole
    }
  }
}
```

**Success Response:**
```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "bearer",
      "user": {
        "id": "user-1",
        "email": "superadmin@example.com",
        "isActive": true
      },
      "permissions": {
        "byRole": {
          "superadmin": {
            "user": { "create": true, "read": true, "update": true, "delete": true, "fields": { ... } },
            "role": { "create": true, "read": true, "update": true, "delete": true, "fields": { ... } }
          }
        }
      }
    }
  }
}
```

**Failed Response (wrong credentials):**
```json
{
  "data": {
    "login": null
  }
}
```

---

### Mutation: `refresh`

**Get new access token using refresh token.**

```graphql
mutation {
  refresh(refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") {
    accessToken
    tokenType
  }
}
```

**Success Response:**
```json
{
  "data": {
    "refresh": {
      "accessToken": "new-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "bearer"
    }
  }
}
```

**Failed Response (invalid/expired token):**
```json
{
  "data": {
    "refresh": null
  }
}
```

---

### Mutation: `createUser`

**Create a new user. Requires create permission on `user` entity.** If an `employee` role exists in the DB it is automatically assigned; otherwise the user is created with no roles. Optional: `dateOfBirth`, `mobileNumber`, `email`.

```graphql
mutation {
  createUser(
    firstName: "Jane"
    lastName: "Doe"
    username: "jane.doe"
    password: "secret123"
    email: "jane@example.com"
  ) {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}
```

---

### Mutation: `updateUser`

**Update a user by id. Requires authentication and update permission on `user` entity.** Accepts all user fields **except username and password**. Only fields you have write permission for can be updated. All arguments except `userId` are optional.

```graphql
mutation {
  updateUser(
    userId: "USER_UUID"
    firstName: "Jane"
    lastName: "Smith"
    dateOfBirth: "1990-01-15"
    mobileNumber: "+1234567890"
    email: "jane@example.com"
    isActive: true
  ) {
    id firstName lastName dateOfBirth mobileNumber username email isActive roles
  }
}
```

**Notes:** `username` and `password` cannot be changed via this mutation. Uniqueness is enforced for `email`. Permission cache for the updated user is invalidated.

---

### Mutation: `deleteUser`

**Delete a user by id. Requires authentication and delete permission on `user` entity.**

```graphql
mutation {
  deleteUser(userId: "USER_UUID")
}
```

**Response:** `true` if the user was deleted, `false` if user not found.

---

### Mutation: `addUserRole`

**Add a role to a user. Requires authentication and update permission on `user` entity.**

```graphql
mutation {
  addUserRole(userId: "USER_UUID", roleId: "ROLE_UUID") {
    id firstName lastName username email isActive roles
  }
}
```

**Response:** Returns updated `UserType` with the role added. Permission cache for the user is invalidated.

**Notes:** This adds a role to the user's existing roles. If the user already has this role, an error is raised.

**Errors:**
- `"User not found"` - if userId doesn't exist
- `"Role not found"` - if roleId doesn't exist
- `"User already has this role"` - if role is already assigned to the user

---

### Mutation: `removeUserRole`

**Remove a role from a user. Requires authentication and update permission on `user` entity.**

```graphql
mutation {
  removeUserRole(userId: "USER_UUID", roleId: "ROLE_UUID") {
    id firstName lastName username email isActive roles
  }
}
```

**Response:** Returns updated `UserType` with the role removed. Permission cache for the user is invalidated.

**Notes:** This removes a role from the user's existing roles. If the user doesn't have this role, an error is raised.

**Errors:**
- `"User not found"` - if userId doesn't exist
- `"Role not found"` - if roleId doesn't exist
- `"User does not have this role"` - if role is not assigned to the user

---

### Mutation: `upsertRoleWithPermissions`

**Create or update a role with all its permissions in a single transaction. Requires authentication and update permission on `role` entity.**

**Create new role (roleId is null):**
```graphql
mutation {
  upsertRoleWithPermissions(
    name: "custom_role"
    description: "Custom role description"
    entityPermissions: [
      {
        entityName: "user"
        canCreate: true
        canRead: true
        canUpdate: true
        canDelete: false
      }
      {
        entityName: "role"
        canCreate: false
        canRead: true
        canUpdate: false
        canDelete: false
      }
    ]
    fieldPermissions: [
      {
        entityName: "user"
        fieldName: "email"
        canRead: true
        canWrite: true
      }
      {
        entityName: "user"
        fieldName: "username"
        canRead: true
        canWrite: false
      }
    ]
  ) {
    role { id name description }
    entityPermissions { id entityName canCreate canRead canUpdate canDelete }
    fieldPermissions { id entityName fieldName canRead canWrite }
  }
}
```

**Update existing role (provide roleId):**
```graphql
mutation {
  upsertRoleWithPermissions(
    name: "updated_role_name"
    roleId: "ROLE_UUID"
    description: "Updated description"
    entityPermissions: [
      {
        entityName: "user"
        canCreate: true
        canRead: true
        canUpdate: true
        canDelete: true
      }
    ]
    fieldPermissions: [
      {
        entityName: "user"
        fieldName: "email"
        canRead: true
        canWrite: true
      }
    ]
  ) {
    role { id name description }
    entityPermissions { id entityName canCreate canRead canUpdate canDelete }
    fieldPermissions { id entityName fieldName canRead canWrite }
  }
}
```

**Response:** Returns `RoleWithPermissionsType` with role info and all permissions.

**Notes:**
- **Upsert behavior:**
  - If `roleId` is `null` or not provided: creates a new role
  - If `roleId` exists: updates role name/description (cannot rename system roles)
- **Permission strategy:** Always sets complete state of permissions:
  - Updates existing permissions (preserves IDs where possible)
  - Creates new permissions that don't exist
  - Deletes permissions not included in the input
  - Entity permissions matched by `entityName`
  - Field permissions matched by `entityName` + `fieldName`
- Any permissions not included in the input will be **deleted**.
- Permission cache for all users with this role is invalidated automatically.
- All operations happen in a single transaction (atomic).

**Errors:**
- `"Role not found"` - if roleId is provided but doesn't exist
- `"Role '{name}' already exists"` - if creating new role with duplicate name, or updating to a name that conflicts
- `"Cannot rename system role '{name}'"` - if attempting to rename a system role
- `"Not enough permissions to manage roles"` - if user doesn't have update permission on `role` entity

---

## Pagination

### Overview

All list queries support pagination with `skip` and `limit` parameters.

**Parameters:**
- `skip`: Number of items to skip (default: 0, min: 0)
- `limit`: Items per page (default: 100, min: 1, max: 1000)

**Response Fields:**
- `items`: Array of actual data
- `total`: Total number of items
- `skip`: Current skip value
- `limit`: Current limit value
- `page`: Current page number (1-indexed)
- `totalPages`: Total pages available
- `hasMore`: Boolean indicating if more items exist

### Basic Pagination

**First Page:**
```graphql
query {
  users(page: 1, pageSize: 10) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive
      roles { id name }
    }
    total
    page
    totalPages
    hasMore
    firstPage
    lastPage
  }
}
```

**Second Page:**
```graphql
query {
  users(page: 2, pageSize: 10) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive
      roles { id name }
    }
    total
    page
    hasMore
  }
}
```

### Load More Pattern

**Initial Load:**
```graphql
query {
  users(page: 1, pageSize: 20) {
    items { id firstName lastName dateOfBirth mobileNumber username email isActive roles { id name } }
    total
    hasMore
  }
}
```

**Next Page (if hasMore = true):**
```graphql
query {
  users(page: 2, pageSize: 20) {
    items { id firstName lastName dateOfBirth mobileNumber username email isActive roles { id name } }
    hasMore
  }
}
```

### Large Dataset Handling

**Load up to max page size:**
```graphql
query {
  users(page: 1, pageSize: 200) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive
      roles { id name }
    }
    total
    hasMore
  }
}
```

### Pagination with JavaScript

```javascript
// Query using page/pageSize
const page = 3;
const pageSize = 50;

const query = `
  query {
    users(page: ${page}, pageSize: ${pageSize}) {
      items { id firstName lastName dateOfBirth mobileNumber username email isActive roles }
      total
      page
      totalPages
      firstPage
      lastPage
    }
  }
`;
```

---

## Audit & Timestamps

### Automatic created_at / modified_at

- All entities using `AuditMixin` get **created_at** and **modified_at** set automatically when saving.
- **Where:** A single `Session.before_flush` event in `app/infrastructure/database.py` sets current UTC when not provided:
  - **Insert:** For each object in `session.new`, `created_at` and `modified_at` are set to `datetime.now(timezone.utc)` if `None`.
  - **Update / soft delete:** For each object in `session.dirty`, `modified_at` is set to current UTC.
- No per-service calls are required; the persistence layer handles it for all entities.

### createdAt / modifiedAt / createdBy / modifiedBy / createdByUsername / modifiedByUsername in GraphQL list & get queries

- All list/get item types expose **createdAt** and **modifiedAt** as `DateTime` (ISO 8601) in the schema.
- All list/get item types also expose **createdBy** and **modifiedBy** as read-only `String` fields (user IDs).
- All list/get item types also expose **createdByUsername** and **modifiedByUsername** as read-only `String` fields (username resolved from user ID for display).
- **Audit stamping:** Every create mutation automatically sets `createdBy` from the current authenticated user. Every update/modify mutation automatically sets `modifiedBy` from the current user.
- **Master data:** ProductCategory, Customer, UOM, Tax, PaymentTerm, ExpenseCategory, Supplier, Vendor, Product.
- **Core:** User, Role, EntityPermission, FieldPermission, ModuleStatus.
- Example: in `customers`, `products`, `users`, `roles`, etc., request `createdAt`, `modifiedAt`, `createdBy`, `createdByUsername`, `modifiedBy`, `modifiedByUsername` on `items { ... }`.

### Customer primary and secondary contact fields

- **CustomerType** and **CustomerInput** include: **primaryContactName**, **primaryContactEmail**, **primaryContactMobile**, **secondaryContactName**, **secondaryContactEmail**, **secondaryContactMobile** (all optional). Use them in `customers` / `customer` queries and in `createCustomer` / `updateCustomer` input.

### Why might `customers` (or other list queries) return empty items?

- **No auth:** If the request does not send a valid `Authorization: Bearer <token>`, `current_user` is missing and the resolver returns `items: []`, `total: 0` (no 403). Always send the token for list queries.
- **No permission:** If the user has no read permission on the entity (e.g. `customer`), the API returns **HTTP 403** with a "Not enough permissions" error.
- **No data:** The seed script does not create customers (or other master data) unless you run it on a fresh DB. After a fresh `python -m app.seed`, superadmin has access to all master entities and 3 sample customers are created. For an already-seeded DB, create customers via `createCustomer` mutation or add entity permissions for your role and insert data manually.

---

## Permission System

### HTTP 403 for Permission-Denied GraphQL

All GraphQL APIs use centralized permission checks in the application layer (services). When access is denied (entity or field level), the API responds with **HTTP 403 Forbidden** instead of 200 with empty/partial data. The response body still contains the normal GraphQL error with a message such as `"Not enough permissions to read customer"` or `"Not allowed to write field: email"`. The mechanism is a custom Strawberry schema (`SchemaWith403`) that sets `response.status_code = 403` in `process_errors()` when any error message contains `"Not enough permissions"` or `"Not allowed to write field"`.

### How Permissions Work

**3-Layer Permission System:**

1. **Authentication Layer**: User must be logged in
2. **Entity-Level Permissions**: Can user access this entity? (user, role, etc.)
3. **Field-Level Permissions**: Which fields can user read/write?

### Permission Check Flow

```
User Request
    ↓
Check Authentication (JWT token valid?)
    ↓
Check Entity Permission (can read "user" entity?)
    ↓
Check Field Permissions (can read "email", "hashed_password"?)
    ↓
Filter Response (remove forbidden fields)
    ↓
Return Filtered Data
```

### Checking Your Permissions

**Query your own permissions (grouped by role):**
```graphql
query {
  myPermissions {
    byRole
  }
}
```

**Use permissions in frontend logic:** Permissions are under `byRole` keyed by role name. If the user has one role, use that key; if multiple, merge with OR (allow if any role grants it).

```javascript
// Example: user has one role "superadmin"
const byRole = permissions?.byRole ?? {};
const roleNames = Object.keys(byRole);

function canEditUser(permissions, roleName) {
  return permissions?.byRole?.[roleName]?.user?.update === true;
}
function canEditUserAnyRole(permissions) {
  return Object.values(permissions?.byRole ?? {}).some(r => r?.user?.update === true);
}

function canAccessField(permissions, roleName, entity, field) {
  return permissions?.byRole?.[roleName]?.[entity]?.fields?.[field]?.write === true;
}
```

### Permission Caching

- Permissions are cached in Redis for performance
- Cache TTL: 5 minutes
- Automatically refreshed on permission changes
- No manual cache invalidation needed

---

## Frontend Integration Examples

### JavaScript (Fetch API)

```javascript
const GRAPHQL_URL = 'http://localhost:8000/graphql';

// Login function (user has no roles field; permissions are in permissions.byRole). API uses username.
async function login(username, password) {
  const query = `
    mutation {
      login(username: "${username}", password: "${password}") {
        accessToken
        refreshToken
        user {
          id
          username
          email
          isActive
        }
        permissions {
          byRole
        }
      }
    }
  `;
  
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const result = await response.json();
  
  if (result.data?.login) {
    localStorage.setItem('accessToken', result.data.login.accessToken);
    localStorage.setItem('refreshToken', result.data.login.refreshToken);
    return result.data.login;
  }
  
  throw new Error('Login failed');
}

// Fetch users with pagination (all user fields)
async function fetchUsers(page = 1, pageSize = 10) {
  const query = `
    query {
      users(page: ${page}, pageSize: ${pageSize}) {
        items {
          id
          firstName
          lastName
          dateOfBirth
          mobileNumber
          username
          email
          isActive
          roles
        }
        total
        page
        totalPages
        hasMore
        firstPage
        lastPage
      }
    }
  `;
  
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query })
  });
  
  const result = await response.json();
  return result.data.users;
}

// Refresh token
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const query = `
    mutation {
      refresh(refreshToken: "${refreshToken}") {
        accessToken
        tokenType
      }
    }
  `;
  
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const result = await response.json();
  
  if (result.data?.refresh) {
    localStorage.setItem('accessToken', result.data.refresh.accessToken);
    return result.data.refresh.accessToken;
  }
  
  throw new Error('Token refresh failed');
}

// Auto-refresh interceptor
async function executeGraphQL(query, variables = {}) {
  try {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables })
    });
    
    const result = await response.json();
    
    // Check for auth error
    if (result.errors?.some(e => e.extensions?.code === 'UNAUTHENTICATED')) {
      // Try to refresh token
      await refreshAccessToken();
      // Retry query
      return executeGraphQL(query, variables);
    }
    
    return result;
  } catch (error) {
    console.error('GraphQL error:', error);
    throw error;
  }
}
```

---

### React with Apollo Client

```typescript
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider, gql, useQuery, useMutation } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Setup Apollo Client
const httpLink = new HttpLink({
  uri: 'http://localhost:8000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// App wrapper
function App() {
  return (
    <ApolloProvider client={client}>
      <YourApp />
    </ApolloProvider>
  );
}

// Login component (user has id, username, email, isActive; permissions.byRole has permissions per role). API uses username.
const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        isActive
      }
      permissions {
        byRole
      }
    }
  }
`;

function LoginForm() {
  const [login, { data, loading, error }] = useMutation(LOGIN_MUTATION);
  
  const handleSubmit = async (username, password) => {
    const result = await login({ variables: { username, password } });
    
    if (result.data?.login) {
      localStorage.setItem('accessToken', result.data.login.accessToken);
      localStorage.setItem('refreshToken', result.data.login.refreshToken);
    }
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(e.target.username.value, e.target.password.value);
    }}>
      <input name="username" type="text" placeholder="Username" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}

// Users list with pagination (all user fields)
const GET_USERS = gql`
  query GetUsers($page: Int!, $pageSize: Int!) {
    users(page: $page, pageSize: $pageSize) {
      items {
        id
        firstName
        lastName
        dateOfBirth
        mobileNumber
        username
        email
        isActive
        roles
      }
      total
      skip
      limit
      page
      totalPages
      hasMore
      firstPage
      lastPage
    }
  }
`;

function UsersList() {
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  
  const { loading, error, data } = useQuery(GET_USERS, {
    variables: { page, pageSize }
  });
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  const { items, total, totalPages, hasMore, firstPage, lastPage } = data.users;
  
  return (
    <div>
      <h2>Users ({total} total)</h2>
      <ul>
        {items.map(user => (
          <li key={user.id}>
            {user.email} - {user.roles.join(', ')}
            {!user.isActive && ' (Inactive)'}
          </li>
        ))}
      </ul>
      
      <div>
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Current user query
const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      id
      email
      roles
    }
  }
`;

function UserProfile() {
  const { loading, error, data } = useQuery(GET_CURRENT_USER);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  const user = data.currentUser;
  
  return (
    <div>
      <h2>Profile</h2>
      <p>Email: {user.email}</p>
      <p>Roles: {user.roles.join(', ')}</p>
    </div>
  );
}
```

---

### Vue 3 with Composition API

```vue
<template>
  <div>
    <h2>Users ({{ total }} total)</h2>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <ul v-else>
      <li v-for="user in users" :key="user.id">
        {{ user.email }} - {{ user.roles.join(', ') }}
      </li>
    </ul>
    
    <div class="pagination">
      <button @click="prevPage" :disabled="page === 1">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button @click="nextPage" :disabled="!hasMore">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import gql from 'graphql-tag';

const GET_USERS = gql`
  query GetUsers($page: Int!, $pageSize: Int!) {
    users(page: $page, pageSize: $pageSize) {
      items {
        id
        firstName
        lastName
        dateOfBirth
        mobileNumber
        username
        email
        isActive
        roles
      }
      total
      skip
      limit
      page
      totalPages
      hasMore
      firstPage
      lastPage
    }
  }
`;

const page = ref(1);
const pageSize = 10;

const { result, loading, error } = useQuery(GET_USERS, () => ({
  page: page.value,
  pageSize: pageSize
}));

const users = computed(() => result.value?.users.items || []);
const total = computed(() => result.value?.users.total || 0);
const totalPages = computed(() => result.value?.users.totalPages || 0);
const hasMore = computed(() => result.value?.users.hasMore || false);

function nextPage() {
  if (hasMore.value) page.value++;
}

function prevPage() {
  if (page.value > 1) page.value--;
}
</script>
```

---

### Python with requests

```python
import requests
from typing import Dict, Any, Optional

GRAPHQL_URL = 'http://localhost:8000/graphql'

class GraphQLClient:
    def __init__(self, url: str):
        self.url = url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
    
    def execute(self, query: str, variables: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute GraphQL query/mutation"""
        headers = {'Content-Type': 'application/json'}
        
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        payload = {'query': query}
        if variables:
            payload['variables'] = variables
        
        response = requests.post(self.url, json=payload, headers=headers)
        result = response.json()
        
        # Check for auth errors and try to refresh
        if result.get('errors'):
            for error in result['errors']:
                if error.get('extensions', {}).get('code') == 'UNAUTHENTICATED':
                    if self.refresh_access_token():
                        # Retry with new token
                        return self.execute(query, variables)
        
        return result
    
    def login(self, username: str, password: str) -> Dict[str, Any]:
        """Login and store tokens; user has id, username, email, isActive; permissions.byRole has per-role permissions"""
        query = '''
        mutation {
          login(username: "%s", password: "%s") {
            accessToken
            refreshToken
            user {
              id
              username
              email
              isActive
            }
            permissions {
              byRole
            }
          }
        }
        ''' % (username, password)
        
        result = self.execute(query)
        
        if result.get('data', {}).get('login'):
            login_data = result['data']['login']
            self.access_token = login_data['accessToken']
            self.refresh_token = login_data['refreshToken']
            return login_data
        
        raise Exception('Login failed')
    
    def refresh_access_token(self) -> bool:
        """Refresh access token"""
        if not self.refresh_token:
            return False
        
        query = '''
        mutation {
          refresh(refreshToken: "%s") {
            accessToken
            tokenType
          }
        }
        ''' % self.refresh_token
        
        result = self.execute(query)
        
        if result.get('data', {}).get('refresh'):
            self.access_token = result['data']['refresh']['accessToken']
            return True
        
        return False
    
    def get_users(self, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """Get paginated users (all user fields)"""
        query = '''
        query {
          users(page: %d, pageSize: %d) {
            items {
              id
              firstName
              lastName
              dateOfBirth
              mobileNumber
              username
              email
              isActive
              roles
            }
            total
            skip
            limit
            page
            totalPages
            hasMore
            firstPage
            lastPage
          }
        }
        ''' % (page, page_size)
        
        result = self.execute(query)
        return result.get('data', {}).get('users', {})

# Usage example
client = GraphQLClient(GRAPHQL_URL)

# Login (by username)
login_result = client.login('admin', 'admin123')
print(f"Logged in as: {login_result['user']['username']} ({login_result['user']['email']})")

# Get users (first page)
users_data = client.get_users(skip=0, limit=10)
print(f"Total users: {users_data['total']}")
print(f"Page {users_data['page']} of {users_data['totalPages']}")

for user in users_data['items']:
    print(f"  - {user['email']} ({', '.join(user['roles'])})")

# Load more if available
if users_data['hasMore']:
    more_users = client.get_users(skip=10, limit=10)
    print(f"Loaded {len(more_users['items'])} more users")
```

---

## Error Handling

### Common GraphQL Errors

**1. Invalid Credentials**
```json
{
  "data": {
    "login": null
  }
}
```

**2. Expired/Invalid Token**
```json
{
  "errors": [
    {
      "message": "Invalid or expired token",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

**3. Permission Denied**
```json
{
  "errors": [
    {
      "message": "Not enough permissions",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

**4. Invalid Query**
```json
{
  "errors": [
    {
      "message": "Cannot query field \"invalidField\" on type \"UserType\"",
      "locations": [{"line": 3, "column": 5}]
    }
  ]
}
```

### Error Handling Pattern

```javascript
function handleGraphQLResponse(response) {
  // Check for errors
  if (response.errors) {
    for (const error of response.errors) {
      const code = error.extensions?.code;
      
      switch (code) {
        case 'UNAUTHENTICATED':
          // Token expired - refresh it
          return refreshAccessToken().then(() => retryQuery());
        
        case 'FORBIDDEN':
          // Permission denied
          showError('You don\'t have permission to access this resource');
          return null;
        
        default:
          // Other errors
          console.error('GraphQL error:', error.message);
          showError(error.message);
          return null;
      }
    }
  }
  
  // Return data if no errors
  return response.data;
}

// Usage
const response = await executeGraphQL(query);
const data = handleGraphQLResponse(response);

if (data) {
  // Process successful response
  console.log('Users:', data.users);
}
```

### Retry Logic for Token Refresh

```javascript
async function executeWithRetry(query, variables, maxRetries = 1) {
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ query, variables })
      });
      
      const result = await response.json();
      
      // Check for auth error
      const hasAuthError = result.errors?.some(
        e => e.extensions?.code === 'UNAUTHENTICATED'
      );
      
      if (hasAuthError && attempts < maxRetries) {
        // Try to refresh token
        await refreshAccessToken();
        attempts++;
        continue;
      }
      
      return result;
    } catch (error) {
      if (attempts >= maxRetries) {
        throw error;
      }
      attempts++;
    }
  }
}
```

---

## Best Practices

### 1. Token Management

```javascript
// ✅ Good: Store access token in memory or sessionStorage
sessionStorage.setItem('accessToken', token);

// ✅ Good: Store refresh token in HttpOnly cookie (via backend)
// Never expose refresh token in client-side code

// ❌ Bad: Store tokens in localStorage (XSS vulnerable)
// localStorage.setItem('refreshToken', token);

// ✅ Good: Clear tokens on logout
function logout() {
  sessionStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Redirect to login
}
```

### 2. Query Fragments

**Reuse common field selections:**

```graphql
fragment UserFields on UserType {
  id
  firstName
  lastName
  dateOfBirth
  mobileNumber
  username
  email
  isActive
  roles
}

query GetAllUsers {
  users(page: 1, pageSize: 10) {
    items {
      ...UserFields
    }
  }
}

query GetCurrentUser {
  currentUser {
    ...UserFields
  }
}
```

### 3. Permission Checks Before Rendering

```javascript
// Fetch permissions on app load (returns byRole: { roleName: { entityName: { ... } } })
async function loadUserPermissions() {
  const query = `
    query {
      myPermissions {
        byRole
      }
    }
  `;
  
  const result = await executeGraphQL(query);
  return result.data.myPermissions;
}

// Check permissions before showing UI elements (permissions are grouped by role)
function canEditUserAnyRole(permissions) {
  const byRole = permissions?.byRole ?? {};
  return Object.values(byRole).some(r => r?.user?.update === true);
}

function canAccessFieldAnyRole(permissions, entity, field) {
  const byRole = permissions?.byRole ?? {};
  return Object.values(byRole).some(r => r?.[entity]?.fields?.[field]?.write === true);
}

// In your component
const permissions = await loadUserPermissions();

if (canEditUserAnyRole(permissions)) {
  // Show edit button
}

if (!canAccessFieldAnyRole(permissions, 'user', 'hashed_password')) {
  // Hide password field
}
```

### 4. Pagination Best Practices

```javascript
// ✅ Good: Use reasonable page sizes
const limit = 50; // Good for most cases

// ✅ Good: Show loading state during pagination
const [loading, setLoading] = useState(false);

async function loadMore() {
  setLoading(true);
  const moreData = await fetchUsers(currentSkip + limit, limit);
  setLoading(false);
  appendUsers(moreData.items);
}

// ✅ Good: Implement infinite scroll with hasMore check
if (usersData.hasMore && isNearBottom) {
  loadMore();
}

// ❌ Bad: Loading all data at once
// const allUsers = await fetchUsers(0, 999999);
```

### 5. Caching Strategy

```javascript
// Use Apollo Client cache
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          users: {
            // Merge paginated results
            keyArgs: false,
            merge(existing = { items: [] }, incoming) {
              return {
                ...incoming,
                items: [...existing.items, ...incoming.items]
              };
            }
          }
        }
      }
    }
  })
});
```

### 6. TypeScript Types Generation

**Use GraphQL Code Generator:**

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript
npx graphql-codegen init
```

**codegen.yml:**
```yaml
schema: http://localhost:8000/graphql
generates:
  ./src/types/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
```

**Generated types:**
```typescript
import { useQuery } from '@apollo/client';
import { GetUsersQuery, GetUsersQueryVariables } from './types/graphql';

const { data } = useQuery<GetUsersQuery, GetUsersQueryVariables>(GET_USERS, {
  variables: { skip: 0, limit: 10 }
});

// data is fully typed!
const users = data?.users.items; // UserType[]
```

### 7. Error Boundaries (React)

```typescript
class GraphQLErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('GraphQL Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Wrap app
<GraphQLErrorBoundary>
  <App />
</GraphQLErrorBoundary>
```

---

## Troubleshooting

### Q: Getting "Invalid or expired token" error

**A:** Check Authorization header format:
```
Authorization: Bearer <token>
```
Note the space between "Bearer" and the token.

### Q: Login returns null

**A:** Verify:
- Correct email and password
- User is active (`isActive: true`)
- Check test credentials above

### Q: Can't see user data even though logged in

**A:** Check permissions (returned by role):
```graphql
query {
  myPermissions {
    byRole
  }
}
```
Verify one of your roles has read access to the entity under `byRole.<roleName>.<entity>.read`.

### Q: How to know what fields I can read/write?

**A:** Run `myPermissions` query:
```graphql
query {
  myPermissions {
    byRole
  }
}
```
Shows permissions per role: `byRole.<roleName>.<entity>.fields.<fieldName>.read` / `.write`.

### Q: Pagination not working

**A:** Ensure you're using paginated response structure:
```graphql
query {
  users(page: 1, pageSize: 10) {
    items {    # ← Access items, not users directly
      id firstName lastName dateOfBirth mobileNumber username email isActive roles
    }
    total
    hasMore
  }
}
```

### Q: Why can't I see admin endpoints?

**A:** Only users with admin role can access admin queries.
Use username `admin` (password `admin123`) for testing.

### Q: How to refresh my token?

**A:** Use the `refresh` mutation:
```graphql
mutation {
  refresh(refreshToken: "your-refresh-token") {
    accessToken
    tokenType
  }
}
```
Then update your Authorization header.

---

## Summary

✅ **GraphQL-Only Backend**
- Single endpoint: `/graphql`
- Full introspection support
- All Master Data list queries use `page` (1-indexed, default 1) and `pageSize` (default 20, max 200). Responses include `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`, `skip`, and `limit`.
- Optional **search/filter** arguments for those lists are in the Master Data rows above and in **[Master Data list search parameters (quick reference)](#master-data-list-search-parameters-quick-reference)**. When you change search parameters in code, update that subsection, the main query table row, and any examples ([keeping this document in sync](#keeping-this-document-in-sync-with-graphql-changes)).

✅ **Queries (single source of truth: this document)**

**Core:** `hello`, `getEnumEntities`, `getEnumFields`, `enabledModules`, `currentUser`, `user`, `users`, `getRoles`, `getRolePermissions`, `myPermissions`, `entities`, `entityFields`.

**Project Management & Design/BOM (require module `project_management` enabled):** `projects`, `project`, `projectAssignments`, `projectAssignmentBoard`, `fixtures`, `fixture`, `bomView`, `getDesignUploadUrl`, `parseBomFile`, `getDrawingViewUrl`, `getProjectBomUploadUrl`, `parseProjectBomFile`, `getManufacturedPoUploadUrl`.

**Master Data (require module `master_data` enabled):** `productCategories`, `productCategory`, `customers`, `customer`, `uomList`, `uom`, `taxList`, `tax`, `paymentTermsList`, `paymentTerm`, `expenseCategoriesList`, `expenseCategory`, `suppliers`, `supplier`, `vendors`, `vendor`, `products`, `product`, `purchaseOrders`, `purchaseOrder`, `exportPurchaseOrderLineItemsXlsx`, `exportCollectByAssemblyExcel`, `getPurchaseOrderAttachmentUploadUrl`, `getPurchaseOrderAttachmentDownloadUrl`.

**Project Management — PO queries (require module `project_management` enabled):** `purchaseOrdersByFixture`, `standardPartsForPo`.

✅ **Mutations (single source of truth: this document)**

**Core:** `login`, `refresh`, `createUser`, `updateUser`, `changePassword`, `setUserPassword`, `deleteUser`, `deleteRole`, `addUserRole`, `removeUserRole`, `upsertRoleWithPermissions`, `setModuleEnabled`.

**Project Management & Design/BOM (require module `project_management` enabled):** `createProject`, `updateProject`, `deleteProject`, `assignProjectPrincipal`, `removeProjectPrincipal`, `createFixture`, `updateFixture`, `deleteFixture`, `submitBomUpload`, `submitProjectBomUpload`, `sendManufacturedToVendor`, `exportManufacturedPoExcel`, `importManufacturedPoExcel`, `createManufacturedPo`, `updateManufacturedStatusBulk`, `updateManufacturedQty`, `updateManufacturedReceivedQty`, `updateStandardPartPurchaseUnitPrice`, `exportStandardPoExcel`, `createStandardPo`, `exportBomViewExcel`.

**Master Data (require module `master_data` enabled):** `createProductCategory`, `updateProductCategory`, `deleteProductCategory`, `createCustomer`, `updateCustomer`, `deleteCustomer`, `createUOM`, `updateUOM`, `deleteUOM`, `createTax`, `updateTax`, `deleteTax`, `createPaymentTerm`, `updatePaymentTerm`, `deletePaymentTerm`, `createExpenseCategory`, `updateExpenseCategory`, `deleteExpenseCategory`, `createSupplier`, `updateSupplier`, `deleteSupplier`, `createVendor`, `updateVendor`, `deleteVendor`, `createProduct`, `updateProduct`, `deleteProduct`, `createPurchaseOrder`, `updatePurchaseOrder`, `deletePurchaseOrder`, `receiveStandardParts`, `markBomPartsReceived`, `collectByAssembly`, `parseCostingExcel`, `confirmCosting`.

✅ **Key Features**
- JWT authentication (1h access, 7d refresh). Login is **username-based** (not email).
- Role-based permissions (returned **by role** in `login.permissions.byRole` and `myPermissions.byRole`)
- User type includes: `id`, `firstName`, `lastName`, `dateOfBirth`, `mobileNumber`, `username`, `email`, `isActive`, `roles`. Login user has the same profile fields (no `roles` on user; role names are keys of `byRole`).
- Field-level access control
- Auto-discovery via introspection
- TypeScript-friendly with codegen
- Multiple client libraries supported

✅ **Frontend Ready**
- JavaScript/Fetch examples
- React/Apollo Client examples
- Vue 3 Composition API examples
- Python requests examples
- Error handling patterns
- Pagination implementations

**Start building with GraphQL!** 🚀

---

## Audit Trail

### Overview

Every `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `EXPORT`, and `UPLOAD` action is recorded in the `audit_logs` table. The system is:
- **Automatic** — any model inheriting `AuditMixin` is automatically audit-logged on INSERT, UPDATE, and DELETE via a SQLAlchemy `before_flush` event listener. No manual `log_audit()` calls needed in service code.
- **Append-only** — entries are never soft-deleted or modified.
- **Atomic** — the log entry is written in the same DB transaction as the data change, so there is no data-without-audit state.
- **Field-level** — the `changes` JSONB column stores `{field: [old_value, new_value]}` pairs, allowing fine-grained search.
- **Context-enriched** — every entry automatically captures `ip_address`, `request_id`, `user_agent`, and `source` from the request-scoped `AuditContext` (set once per request in the GraphQL context getter).

### How automatic auditing works

1. **`install_audit_listener()`** in `app/infrastructure/database.py` registers a `before_flush` event on all SQLAlchemy sessions.
2. On every flush, the listener inspects `session.new` (INSERTs), `session.dirty` (UPDATEs), and `session.deleted` (hard DELETEs).
3. For each object whose model has `AuditMixin` (detected via `is_deleted` attribute), it auto-generates an `AuditLog` entry with field-level diffs.
4. Soft-deletes are detected by checking if `is_deleted` changed from `False` to `True` in a dirty object.
5. `AuditMixin` bookkeeping fields (`created_at`, `modified_at`, `id`, etc.) are excluded from diffs.

### Model opt-out controls

| Attribute | Effect |
|-----------|--------|
| `__audit_exclude__ = True` | Entire model is skipped by the auto-listener (e.g. `RefreshToken`, `EntityPermission`, `FieldPermission`) |
| `__audit_exclude_fields__ = {"hashed_password"}` | Specific fields are excluded from change diffs (e.g. `User.hashed_password`) |

### Manual `log_audit()` (non-ORM events)

For actions that don't map to a single model flush, `log_audit()` is still called manually:
- `ACTION_LOGIN` — in `auth_service.login()`
- `ACTION_UPLOAD` — in `design_bom_service.submit_bom_upload()` / `submit_project_bom_upload()`
- `ACTION_EXPORT` — in `design_bom_service.create_manufactured_po_mail()` / `create_standard_po_mail()`
- `ACTION_PERMISSION_CHANGE` — in `role_service.upsert_role_with_permissions()`

### Database model

```
audit_logs
  id           VARCHAR(36)   PK
  timestamp    DATETIME      NOT NULL  indexed
  user_id      VARCHAR(36)   nullable  indexed  (null = system action)
  user_name    VARCHAR(100)  nullable
  action       VARCHAR(20)   NOT NULL  indexed  (CREATE|UPDATE|DELETE|LOGIN|EXPORT|UPLOAD|CONFIG|PERMISSION_CHANGE)
  entity_name  VARCHAR(100)  NOT NULL  indexed  (e.g. "customer", "purchase_order", "fixture")
  entity_id    VARCHAR(36)   nullable  indexed
  entity_label VARCHAR(255)  nullable           (auto-resolved from name/code/title/etc.)
  changes      JSONB         nullable
  request_id   VARCHAR(36)   nullable  indexed  (correlates entries from one API request)
  ip_address   VARCHAR(45)   nullable
  user_agent   VARCHAR(512)  nullable
  source       VARCHAR(50)   nullable           ("graphql", "rest", "system", etc.)

  Composite indexes:
    ix_audit_logs_entity_lookup   (entity_name, entity_id)
    ix_audit_logs_entity_timeline (entity_name, timestamp)
    ix_audit_logs_user_timeline   (user_id, timestamp)
```

Alembic migrations:
- **041** (`alembic/versions/20240101_000041_add_audit_logs.py`) — initial table
- **002** (`alembic/versions/20260401_000002_add_deleted_by_and_request_id.py`) — `deleted_by` on AuditMixin, `request_id` on audit_logs
- **003** (`alembic/versions/20260401_000003_add_audit_context_columns_and_indexes.py`) — `user_agent`, `source`, composite indexes

### What is logged

| Entity / area            | Actions logged                     |
|--------------------------|-------------------------------------|
| ProductCategory          | CREATE, UPDATE, DELETE              |
| Customer                 | CREATE, UPDATE, DELETE              |
| UOM                      | CREATE, UPDATE, DELETE              |
| Tax                      | CREATE, UPDATE, DELETE              |
| PaymentTerm              | CREATE, UPDATE, DELETE              |
| ExpenseCategory          | CREATE, UPDATE, DELETE              |
| Supplier                 | CREATE, UPDATE, DELETE              |
| Vendor                   | CREATE, UPDATE, DELETE              |
| Product                  | CREATE, UPDATE, DELETE              |
| PurchaseOrder            | CREATE, UPDATE, DELETE              |
| Fixture                  | CREATE, UPDATE, BOM UPLOAD (UPLOAD), PO EXPORT (EXPORT) |
| User (login)             | LOGIN                               |
| Role / Permissions       | CREATE, UPDATE, DELETE, PERMISSION_CHANGE |

### GraphQL query: `auditLogs`

**Permission required:** `audit_log.read`

```graphql
query GetAuditLogs(
  $page: Int
  $pageSize: Int
  $userId: String
  $userNameContains: String
  $action: String
  $entityName: String
  $entityId: String
  $requestId: String       # correlate all entries from a single API request
  $source: String          # filter by origin: "graphql", "rest", "system", etc.
  $fieldName: String
  $oldValueContains: String
  $newValueContains: String
  $fromDate: String
  $toDate: String
) {
  auditLogs(
    page: $page
    pageSize: $pageSize
    userId: $userId
    userNameContains: $userNameContains
    action: $action
    entityName: $entityName
    entityId: $entityId
    requestId: $requestId
    source: $source
    fieldName: $fieldName
    oldValueContains: $oldValueContains
    newValueContains: $newValueContains
    fromDate: $fromDate
    toDate: $toDate
  ) {
    total
    skip
    limit
    page
    totalPages
    hasMore
    firstPage
    lastPage
    items {
      id
      timestamp
      userId
      userName
      action
      entityName
      entityId
      entityLabel
      requestId
      ipAddress
      userAgent
      source
      changes {
        field
        oldValue
        newValue
      }
    }
  }
}
```

**Response types:**

| Type              | Fields                                                                                             |
|-------------------|----------------------------------------------------------------------------------------------------|
| `AuditLogListType` | `items`, `total`, `page`, `totalPages`, `hasMore`, `firstPage`, `lastPage`                        |
| `AuditLogType`    | `id`, `timestamp`, `userId`, `userName`, `action`, `entityName`, `entityId`, `entityLabel`, `requestId`, `ipAddress`, `userAgent`, `source`, `changes` |
| `AuditChangeType` | `field`, `oldValue`, `newValue`                                                                    |

**Filter parameters:**

| Parameter          | Type   | Description                                                            |
|--------------------|--------|------------------------------------------------------------------------|
| `page`             | Int    | Page number (default 1)                                                |
| `pageSize`         | Int    | Items per page (default 20)                                            |
| `userId`           | String | Exact user ID                                                          |
| `userNameContains` | String | Case-insensitive substring on `user_name`                              |
| `action`           | String | Exact action (CREATE, UPDATE, DELETE, LOGIN, EXPORT, UPLOAD, ...)      |
| `entityName`       | String | Exact entity name (e.g. "customer", "fixture")                         |
| `entityId`         | String | Exact entity primary key                                               |
| `requestId`        | String | Exact request correlation ID (groups all entries from one API call)     |
| `source`           | String | Exact source filter (e.g. "graphql", "rest", "system")                 |
| `fieldName`        | String | Checks if `changes` JSONB contains this key (e.g. "name")             |
| `oldValueContains` | String | Case-insensitive substring match within old values in the changes JSON |
| `newValueContains` | String | Case-insensitive substring match within new values in the changes JSON |
| `fromDate`         | String | ISO 8601 datetime: `2026-01-01` or `2026-01-01T00:00:00`              |
| `toDate`           | String | ISO 8601 datetime: `2026-12-31` or `2026-12-31T23:59:59`              |

### Example use-cases

**User timeline (last 20 actions by a specific user):**
```graphql
auditLogs(userId: "abc-123", page: 1, pageSize: 20) { ... }
```

**Admin search — who changed customer name last month:**
```graphql
auditLogs(entityName: "customer", fieldName: "name", fromDate: "2026-03-01", toDate: "2026-03-31") { ... }
```

**Find all logins:**
```graphql
auditLogs(action: "LOGIN", fromDate: "2026-03-28") { ... }
```

**Find what was changed to "ACME Corp":**
```graphql
auditLogs(newValueContains: "ACME Corp") { ... }
```

**Correlate all changes from a single API request:**
```graphql
auditLogs(requestId: "550e8400-e29b-41d4-a716-446655440000") { ... }
```

**Filter by source (e.g. only GraphQL mutations):**
```graphql
auditLogs(source: "graphql", action: "CREATE", fromDate: "2026-04-01") { ... }
```

### UI integration notes

#### Three usage modes

| Mode | How to call | When to use |
|---|---|---|
| **Admin search screen** | Full filter set, user controls all params | Dedicated "Audit Logs" admin menu item |
| **User timeline widget** | Hardcode `userId: currentUser.id`, no search bar | Dashboard / user profile drawer |
| **Entity detail view** | Hardcode `entityName` + `entityId`, no search bar | Customer / PO / Fixture detail page — shows that record's history only |

#### Dropdown filter values

`action` — send uppercase exact values:

```
CREATE  UPDATE  DELETE  LOGIN  UPLOAD  EXPORT  PERMISSION_CHANGE
```

`entityName` — send lowercase snake_case exact values:

```
customer  product  product_category  uom  tax  payment_term
expense_category  supplier  vendor  purchase_order  fixture  role  user
```

#### Pagination

Same pattern as all master data list APIs — use `firstPage` / `lastPage` / `totalPages` / `hasMore` from the response:

- Disable **Prev / First** when `page === firstPage`
- Disable **Next / Last** when `!hasMore` or `page === lastPage`
- Reset `page` to `1` whenever any filter changes
- Recommended page-size options: `10 / 20 / 50 / 100` (backend caps at 200)
- Results are always ordered **newest first** (`timestamp DESC`) — no client-side sort needed

#### Rendering changes

Each item has a `changes` array of `{ field, oldValue, newValue }`. Display rules:

| Condition | Display |
|---|---|
| `oldValue` is `null` | `{field}: created as "{newValue}"` |
| `newValue` is `null` | `{field}: deleted (was "{oldValue}")` |
| both present | `{field}: "{oldValue}" → "{newValue}"` |

#### Action badge colours (suggested)

| Action | Colour |
|---|---|
| `CREATE` | green |
| `UPDATE` | blue |
| `DELETE` | red |
| `LOGIN` | grey |
| `UPLOAD` | orange |
| `EXPORT` | purple |
| `PERMISSION_CHANGE` | yellow |

#### Permission guard

The `auditLogs` query requires the `audit_log.read` permission. Hide the admin menu item and guard the route using the same permission-check pattern used for other protected entities. The user timeline widget (scoped to `userId: currentUser.id`) does not need a separate permission guard at the UI level — the backend enforces it.

#### Server-side field-level filtering (no UI changes needed)

The backend automatically filters every row in the response before returning it:

1. **Entity check** — if the user has no `can_read` on the row's `entityName` (e.g. `customer`), the entire row is **dropped** from `items`.
2. **Field check** — within `changes`, any entry whose `field` is not readable by the user (per `FieldPermission.can_read`) is **stripped** from the list.
3. **Empty changes** — if all `changes` entries were stripped, the whole row is **dropped**.

Default when no `FieldPermission` rows are configured for an entity: **all fields are visible** (open). Restrictions only apply when a field permission has been explicitly defined.

The UI receives a fully-filtered list and renders it as-is — no client-side permission checks are needed.

`total`, `totalPages`, `hasMore`, `firstPage`, `lastPage` are all calculated **after** permission filtering, so pagination is always accurate and consistent with what the user can actually see.

### Input Type: BomReceiveItemInput

Used in `markBomPartsReceived` mutation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fixtureBomId` | `String!` | Yes | `fixture_bom.id` — use `BomManufacturedPartType.id` or `FixtureProductType.id` from the BOM tree |
| `receivedQty` | `Float!` | Yes | Quantity received. Sets `fixture_bom.received_quantity`. For standard parts also increments `products.quantity`. |

### Input Type: CollectByAssemblyItemInput

Used in `collectByAssembly` mutation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fixtureBomId` | `String!` | Yes | `fixture_bom.id` — use `BomManufacturedPartType.id` or `FixtureProductType.id` |
| `collectedQuantity` | `Float!` | Yes | Quantity collected for assembly. **Cumulative** — increments existing `fixture_bom.collected_byassembly_quantity`. For standard parts decrements `products.quantity`. |

### Input Type: PurchaseOrderLineItemInput

Used in `lineItems` argument of both `createPurchaseOrder` and `updatePurchaseOrder`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fixtureBomId` | `String` | No | Links line item to a FixtureBOM entry |
| `description` | `String` | No | Free-text description (Miscellaneous POs) |
| `expenseCategoryId` | `String` | No | Expense category reference |
| `miscellaneousLineItemCost` | `Float` | No | Cost for Miscellaneous type line items |
| `purchaseUnitPrice` | `Float` | No | Unit price to set. On `updatePurchaseOrder`, this is written back to the source table depending on `poType`: `StandardPart` → updates `products.unit_price` via `fixture_bom.product_id`; `ManufacturedPart` → updates `fixture_bom.purchase_unit_price`; `Miscellaneous` → stored directly on `line_item.unit_price`. Omit to leave existing prices unchanged. |
| `receivedQuantity` | `Float` | No | Sets `fixture_bom.received_quantity` for the linked fixture BOM row. Applies to all PO types. Omit to leave existing received quantity unchanged. |

### Example: List Products (with unitPrice)
```graphql
query GetProducts(
  $page: Int
  $pageSize: Int
  $categoryId: String
  $isActive: Boolean
  $nameContains: String
  $itemCodeContains: String
) {
  products(
    page: $page
    pageSize: $pageSize
    categoryId: $categoryId
    isActive: $isActive
    nameContains: $nameContains
    itemCodeContains: $itemCodeContains
  ) {
    items {
      id
      itemCode
      name
      description
      make
      quantity
      unitPrice          # product's current unit price
      isActive
      puUnitId
      puUnitName
      stkUnitId
      stkUnitName
      locationInStore
      createdAt
      modifiedAt
    }
    total
    page
    totalPages
    hasMore
  }
}
```

### Example: Get Single Product
```graphql
query GetProduct($id: String!) {
  product(id: $id) {
    id
    itemCode
    name
    description
    make
    quantity
    unitPrice
    isActive
    puUnitId
    puUnitName
    stkUnitId
    stkUnitName
    locationInStore
    createdAt
    modifiedAt
  }
}
```

### Example: Get Purchase Order with Line Items
```graphql
query GetPurchaseOrderWithLineItems($id: String!) {
  purchaseOrder(id: $id) {
    id
    poNumber
    title
    poType
    projectId
    details
    vendorId
    vendorName
    supplierId
    supplierName
    attachments          # raw JSON string (legacy)
    parsedAttachments {  # typed list parsed from attachments JSON
      id
      s3Key
      filename
      name
      type               # "costing" | null
      uploadedAt         # ISO datetime string; null for pre-existing records
    }
    poSendDate
    poStatus             # POStatusEnum: Created | CostingUpdated | Completed
    costingUpdatedDate   # auto-stamped by confirmCosting
    completedDate        # auto-stamped on first poStatus → Completed transition
    isActive
    createdAt
    modifiedAt
    lineItems {
      id
      purchaseOrderId
      fixtureBomId
      description
      expenseCategoryId
      miscellaneousLineItemCost
      createdAt
      drawingNumber
      bomDescription
      quantity
      purchaseUnitPrice
      status
      lhRh
      receivedQuantity
      collectedByassemblyQuantity   # set by collectByAssembly mutation
      collectedByUserId             # assembly user id
      collectedAt                   # ISO datetime when collected
    }
  }
}
```

### Example: Get Assembly Users (for Collected by Assembly dropdown)
```graphql
query GetAssemblyUsers {
  users(roleName: "Assembly", limit: 200) {
    items {
      id
      firstName
      lastName
      username
    }
    total
  }
}
```

### Example: BOM Tree — Mark as Received (stock keeper updates received qty)
```graphql
# fixtureBomId = BomManufacturedPartType.id  OR  FixtureProductType.id
mutation MarkAsReceived($items: [BomReceiveItemInput!]!) {
  markBomPartsReceived(items: $items)   # returns count of updated items
}
# variables:
# { "items": [{ "fixtureBomId": "abc-123", "receivedQty": 5.0 }] }
```

### Example: Collected by Assembly
```graphql
mutation CollectByAssembly(
  $collectedByUserId: String!
  $items: [CollectByAssemblyItemInput!]!
) {
  collectByAssembly(
    collectedByUserId: $collectedByUserId
    items: $items
  ) {
    s3Key
    downloadUrl   # presigned Excel download URL — valid 1 hour
  }
}
# variables:
# {
#   "collectedByUserId": "user-uuid",
#   "items": [
#     { "fixtureBomId": "fb-uuid-1", "collectedQuantity": 3.0 },
#     { "fixtureBomId": "fb-uuid-2", "collectedQuantity": 2.0 }
#   ]
# }
```

### Example: Re-download Collect by Assembly Excel (standalone)
```graphql
query ExportCollectByAssemblyExcel(
  $fixtureBomIds: [String!]!
  $collectedByUserId: String!
) {
  exportCollectByAssemblyExcel(
    fixtureBomIds: $fixtureBomIds
    collectedByUserId: $collectedByUserId
  ) {
    s3Key
    downloadUrl
  }
}
```

### Example: Export Purchase Order Line Items to XLSX
```graphql
query ExportPOLineItems($id: String!) {
  exportPurchaseOrderLineItemsXlsx(id: $id) {
    s3Key
    downloadUrl   # presigned S3 URL — valid for 1 hour
  }
}
```

### Example: PO Costing — Step 1: Parse Excel (get preview)
```graphql
# fileBase64 = btoa(binaryString) in the browser, or base64.b64encode(bytes) in Python
# File must be a SHINEROBO Costing Master Sheet XLSX with a 'Costing' sheet
mutation ParseCostingExcel($poId: String!, $fileBase64: String!, $filename: String!) {
  parseCostingExcel(poId: $poId, fileBase64: $fileBase64, filename: $filename) {
    s3Key            # pass this to confirmCosting
    rows {
      drawingNumber
      purchaseUnitPrice  # from 'Total cost' column — per-piece cost including profit
      qtyLh              # from 'Qty LH' column
      qtyRh              # from 'Qty RH' column
      totalCost          # purchaseUnitPrice * (qtyLh + qtyRh)
      matched            # false = drawing not linked to this PO's line items
      quantityMismatch   # true when qtyLh + qtyRh ≠ PO line item quantity; confirmCosting will fail
    }
    unmatchedDrawingNumbers
  }
}
```

### Example: PO Costing — Step 2: Confirm (apply prices + attach Excel)
```graphql
mutation ConfirmCosting($poId: String!, $s3Key: String!) {
  confirmCosting(poId: $poId, s3Key: $s3Key) {
    poId
    updatedCount   # number of fixture_bom rows updated
  }
}
```

### Example: Get Purchase Order Attachment Upload URL
```graphql
# Works for any PO type.
# For Standard Part POs the filename extension is validated server-side.
# Allowed: .xlsx, .xls, .pdf, .csv, .jpg, .jpeg, .png, .gif, .webp, .bmp, .tiff
# Any other extension returns a GraphQLError.
query GetPOAttachmentUploadUrl($poId: String!, $filename: String!) {
  getPurchaseOrderAttachmentUploadUrl(poId: $poId, filename: $filename) {
    uploadUrl
    s3Key
    poId
  }
}
```

### Example: Get Purchase Order Attachment Download URL
```graphql
# s3Key comes from parsedAttachments { s3Key } on the PO
query GetPOAttachmentDownloadUrl($s3Key: String!) {
  getPurchaseOrderAttachmentDownloadUrl(s3Key: $s3Key) {
    downloadUrl   # presigned URL valid for 1 hour (or /fake-s3-download in dev)
    s3Key
    filename
  }
}
```

---

## PO Enum & Output Type Reference

### `POStatusEnum`
| Value | Set by |
|---|---|
| `Created` | Default on `createPurchaseOrder` |
| `CostingUpdated` | Auto-set by `confirmCosting` |
| `Completed` | Set manually via `updatePurchaseOrder(input: { poStatus: Completed })` |

### `PurchaseOrderTypeEnum`
`StandardPart` | `ManufacturedPart` | `Miscellaneous`

### `POAttachmentType` (returned by `parsedAttachments`)
| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Present on costing attachments only |
| `s3Key` | `String` | S3 object key |
| `filename` | `String` | Original filename |
| `name` | `String` | Display name (optional) |
| `type` | `String` | `"costing"` for Excel uploads; `null` for regular attachments |
| `uploadedAt` | `String` | ISO 8601 datetime; `null` for attachments added before this feature |

### `ConfirmCostingResultType`
| Field | Type |
|---|---|
| `poId` | `String` |
| `updatedCount` | `Int` |

### `CostingPreviewType`
| Field | Type |
|---|---|
| `s3Key` | `String` — pass to `confirmCosting` |
| `rows` | `[CostingRowType]` |
| `unmatchedDrawingNumbers` | `[String]` |

### `CostingRowType`
| Field | Type | Notes |
|---|---|---|
| `drawingNumber` | `String` | From `Drawing No.` column |
| `purchaseUnitPrice` | `Float` | From `Total cost` column (per-piece cost incl. profit) |
| `qtyLh` | `Float` | From `Qty LH` column |
| `qtyRh` | `Float` | From `Qty RH` column |
| `totalCost` | `Float` | `purchaseUnitPrice * (qtyLh + qtyRh)` |
| `matched` | `Boolean` | `false` if drawing number not linked to this PO's line items |
| `quantityMismatch` | `Boolean` | `true` when `qtyLh + qtyRh ≠ fixture_bom.quantity`; `confirmCosting` will raise an error |

---

## Superadmin Dashboard Charts

Three read-only queries restricted to users with the **superadmin** role.  All three also require the `project_management` module to be enabled.

### API Table

| query | arguments | returns | description |
|---|---|---|---|
| `superadminProjectCompletionChart` | *(none)* | `ProjectCompletionChartType` | Bar chart: completion % per active project based on fixture-status weights |
| `superadminManufacturingReceivedChart` | *(none)* | `ManufacturingReceivedChartType` | Pie chart: manufactured-part receive % per project-fixture |
| `superadminProjectDeadlineTable` | *(none)* | `ProjectDeadlineTableType` | Table: active projects with a target_date, sorted by remaining days asc (overdue first) |

### Output Types

#### `ProjectCompletionChartType`
| Field | Type | Notes |
|---|---|---|
| `items` | `[ProjectCompletionBarItem]` | One entry per active project |
| `total` | `Int` | Count of items |

#### `ProjectCompletionBarItem`
| Field | Type | Notes |
|---|---|---|
| `projectId` | `String` | |
| `projectNumber` | `String` | |
| `name` | `String` | |
| `customerName` | `String` | |
| `status` | `String` | Project status |
| `totalFixtures` | `Int` | Number of active fixtures |
| `completionPercentage` | `Float` | 0–100; weighted avg of fixture statuses (design_pending=0 … dispatched=100) |

#### `ManufacturingReceivedChartType`
| Field | Type | Notes |
|---|---|---|
| `items` | `[ManufacturingReceivedPieItem]` | One entry per project-fixture that has manufactured parts |
| `total` | `Int` | Count of items |

#### `ManufacturingReceivedPieItem`
| Field | Type | Notes |
|---|---|---|
| `projectId` | `String` | |
| `projectNumber` | `String` | |
| `projectName` | `String` | |
| `fixtureId` | `String` | |
| `fixtureNumber` | `String` | e.g. `S25049-001` |
| `fixtureDescription` | `String` | |
| `totalManufactured` | `Int` | Total manufactured BOM rows for this fixture |
| `receivedManufactured` | `Int` | BOM rows with status = `received` |
| `receivedPercentage` | `Float` | 0–100 |

#### `ProjectDeadlineTableType`
| Field | Type | Notes |
|---|---|---|
| `items` | `[ProjectDeadlineTableRow]` | Sorted by remainingDays asc |
| `total` | `Int` | Count of items |
| `overdueCount` | `Int` | Number of items where `isOverdue = true` |

#### `ProjectDeadlineTableRow`
| Field | Type | Notes |
|---|---|---|
| `projectId` | `String` | |
| `projectNumber` | `String` | |
| `name` | `String` | |
| `customerName` | `String` | |
| `targetDate` | `Date` | |
| `remainingDays` | `Int` | Negative = overdue |
| `status` | `String` | |
| `isOverdue` | `Boolean` | `true` when remainingDays < 0 |

### GraphQL Examples

```graphql
# 1. Superadmin bar chart — project completion
query SuperadminProjectCompletionChart {
  superadminProjectCompletionChart {
    total
    items {
      projectId
      projectNumber
      name
      customerName
      status
      totalFixtures
      completionPercentage
    }
  }
}

# 2. Superadmin pie chart — manufacturing received parts per fixture
query SuperadminManufacturingReceivedChart {
  superadminManufacturingReceivedChart {
    total
    items {
      projectId
      projectNumber
      projectName
      fixtureId
      fixtureNumber
      fixtureDescription
      totalManufactured
      receivedManufactured
      receivedPercentage
    }
  }
}

# 3. Superadmin table — projects with deadlines (overdue first)
query SuperadminProjectDeadlineTable {
  superadminProjectDeadlineTable {
    total
    overdueCount
    items {
      projectId
      projectNumber
      name
      customerName
      targetDate
      remainingDays
      status
      isOverdue
    }
  }
}
```
