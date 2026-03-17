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

---

## Project Overview

**FastAPI backend with GraphQL API and field-level permissions system.**

### Key Features
- ✅ GraphQL API with full introspection
- ✅ **Login by username** (and password); JWT with refresh tokens (1 hour access, 7 days refresh)
- ✅ Role-based access control (RBAC)
- ✅ Entity-level permissions (Create, Read, Update, Delete)
- ✅ Field-level permissions (control which fields can be read/written)
- ✅ Pagination support (up to 1000 items per page)
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
- **Single source of truth:** `app/entity_enums.py` defines `EntityEnum` (permission-managed entities) and per-entity `*FieldsEnum` (e.g. `UserFieldsEnum`, `RoleFieldsEnum`). The registry (`app/entity_registry.py`) and GraphQL queries `getEnumEntities` / `getEnumFields(entityID)` use these enums.
- **Sync script:** `python scripts/sync_entity_enums.py` discovers all SQLAlchemy models from the project (classes mapped to `Base`), excludes `entity_permission`, `field_permission`, `refresh_token` (see `EXCLUDED_ENTITIES` in the script), and updates `app/entity_enums.py` in one run (entities + fields). Writes via a temp file then rename so the enum file is not corrupted if the script stops mid-write. No interactive prompts.

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

### Schema Introspection

GraphQL provides **automatic schema discovery**. No manual documentation sync needed!

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
| `users` | `skip: Int = 0`, `limit: Int = 100` | `PaginatedUsersType!` | Paginated list of users. Requires read permission on `user` entity. `limit` max 1000. |
| `getRoles` | `roleId: String` | `[RoleType!]!` | Get roles. If `roleId` is provided, returns that specific role. Otherwise returns all roles (just role table rows with all fields). Requires read permission on `role` entity. |
| `getRolePermissions` | `roleId: String!` | `RoleWithPermissionsType` | Get role with all its entity and field permissions. Returns role, entityPermissions (list), and fieldPermissions (list). Requires read permission on `role` entity. |
| `myPermissions` | — | `PermissionsType` | Current user's permissions grouped by role (`byRole`). `null` if not authenticated. |
| `entities` | — | `[EntityInfoType!]!` | List ALL entities that CAN have permissions configured (master entity list). Returns entities from master registry (`app/entity_registry.py`), regardless of whether permissions exist. Works even on day one when no permissions exist. Requires read permission on `role` entity. |
| `entityFields` | `entityName: String!` | `[FieldInfoType!]!` | List ALL fields for a given entity that CAN have permissions configured. Uses SQLAlchemy model introspection to discover fields from the entity's model. Works even when no permissions are configured yet. Requires read permission on `role` entity. |

**Master Data (module: master_data; requires `master_data` enabled. All require auth + entity-level permissions.)**

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `productCategories` | `skip: Int = 0`, `limit: Int = 500`, `isActive: Boolean` (optional) | `ProductCategoryListType!` | Paginated product categories (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). Item fields include `parentId` and `parentName`. |
| `productCategory` | `id: String!` | `ProductCategoryType` | Single product category by id. Includes `parentId` and `parentName`. `null` if not found. |
| `customers` | `skip: Int = 0`, `limit: Int = 100`, `isActive: Boolean` (optional) | `CustomerListType!` | Paginated customers (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). |
| `customer` | `id: String!` | `CustomerType` | Single customer by id. `null` if not found. |
| `uomList` | `skip: Int = 0`, `limit: Int = 100`, `isActive: Boolean` (optional) | `UOMListType!` | Paginated UOMs (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). |
| `uom` | `id: String!` | `UOMType` | Single UOM by id. `null` if not found. |
| `taxList` | `skip: Int = 0`, `limit: Int = 100`, `isActive: Boolean` (optional) | `TaxListType!` | Paginated taxes (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). |
| `tax` | `id: String!` | `TaxType` | Single tax by id. `null` if not found. |
| `paymentTermsList` | `skip: Int = 0`, `limit: Int = 100`, `isActive: Boolean` (optional) | `PaymentTermListType!` | Paginated payment terms (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). |
| `paymentTerm` | `id: String!` | `PaymentTermType` | Single payment term by id. `null` if not found. |
| `expenseCategoriesList` | `skip: Int = 0`, `limit: Int = 100`, `isActive: Boolean` (optional) | `ExpenseCategoryListType!` | Paginated expense categories (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). Item fields include `parentId` and `parentName`. |
| `expenseCategory` | `id: String!` | `ExpenseCategoryType` | Single expense category by id. Includes `parentId` and `parentName`. `null` if not found. |
| `suppliers` | `skip: Int = 0`, `limit: Int = 100`, `isActive: Boolean` (optional) | `SupplierListType!` | Paginated suppliers (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). |
| `supplier` | `id: String!` | `SupplierType` | Single supplier by id. `null` if not found. |
| `vendors` | `skip: Int = 0`, `limit: Int = 100`, `isActive: Boolean` (optional) | `VendorListType!` | Paginated vendors (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). |
| `vendor` | `id: String!` | `VendorType` | Single vendor by id. `null` if not found. |
| `products` | `skip: Int = 0`, `limit: Int = 100`, `categoryId: String`, `isActive: Boolean` (optional) | `ProductListType!` | Paginated products (`items`, `total`, `id`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). Optional filter by `categoryId`. |

`isActive` behavior for all Master Data list queries:
- `isActive: true` → only active records
- `isActive: false` → only inactive records
- omit `isActive` (or pass `null`) → both active and inactive records

**Project Management & Design/BOM (module: project_management; requires `project_management` enabled. All require auth + entity-level permissions.)**

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `projects` | `skip: Int = 0`, `limit: Int = 100`, `status: String`, `customerId: String`, `isActive: Boolean` | `ProjectListType!` | Paginated projects (`items`, `total`, `skip`, `limit`, `page`, `totalPages`, `hasMore`). **Scoped by assignment:** `superadmin` sees all projects; all other users see only projects they are assigned to directly or via their role. |
| `project` | `id: String!` | `ProjectType` | Single project by id. Fields: `id`, `projectNumber`, `name`, `customerId`, `customerName`, `description`, `status`, `startDate`, `targetDate`, `actualDeliveryDate`, `budget`, `purchaseBudget`, `designerTargetDate`, `procurementTargetDate`, `manufacturingTargetDate`, `qualityTargetDate`, `assemblyTargetDate`, `isActive`, `remainingDays`, audit fields. `null` if not found. |
| `projectAssignments` | `projectId: String!` | `[ProjectAssignmentType!]!` | List assignments for a project. Requires `read` permission on `project_assignment`. |
| `projectAssignmentBoard` | `projectId: String!` | `ProjectAssignmentBoardType` | Assignment screen payload (project, assignments, assignable users/roles, canAssign). Requires `update` permission on `project_assignment`. |
| `fixtures` | `projectId: String`, `status: String`, `isActive: Boolean`, `skip: Int = 0`, `limit: Int = 100` | `FixtureListType!` | Paginated fixtures (`items`, `total`, `skip`, `limit`). Item fields: `id`, `projectId`, `fixtureNumber`, `fixtureSeq`, `description`, `status`, `s3BomKey`, `bomFilename`, `bomUploadedAt`, `bomUploadedBy`, `isActive`, audit fields. |
| `fixture` | `id: String!` | `FixtureType` | Single fixture by id. Same fields as list item. `null` if not found. |
| `bomView` | `fixtureId: String!`, `drawingNoContains: String`, `drawingDescriptionContains: String`, `standardPartPartNoContains: String`, `standardPartNameContains: String`, `standardPartMakeContains: String` | `BomViewType` | Full BOM view for a fixture, with optional search filters. Returns `fixture`, `manufacturedParts` (list of `BomManufacturedPartType`), and `standardParts` (list of `FixtureProductType`). Standard parts include `qty` (expected from BOM), `currentStock` (from Product master), `purchaseQty` = `max(0, qty − currentStock)`. If any search arguments are provided, filters are applied as case-insensitive "contains" matches on drawing number/description and standard-part partNo/name/make. `null` if fixture not found. |
| `getDesignUploadUrl` | `fixtureId: String!`, `filename: String!` | `DesignUploadUrlType` | Get a presigned S3 upload URL for a BOM file (`.xlsx` or `.zip`). Returns `uploadUrl`, `s3Key`, `fixtureId`. PUT the file bytes to `uploadUrl` before calling `parseBomFile`. |
| `parseBomFile` | `fixtureId: String!`, `s3Key: String!` | `BomParseResultType` | **Fixture-level (legacy).** Parse a previously uploaded BOM file (preview only — no DB write). Returns `manufacturedParts`, `standardParts`, `wrongEntries`, `summary`. Now validates fixture number from Excel header, flags drawings outside the declared fixture (`fixtureMismatchCount`). Standard parts include `fixtureSeq`. `summary` includes `bomFixtureSeq`, `duplicateDrawingCount`, `fixtureMismatchCount`. |
| `getDrawingViewUrl` | `partId: String!` | `DrawingViewUrlType` | Get a presigned GET URL to view/download a manufactured part's drawing file. Returns `viewUrl`, `partId`, `drawingNo`. Raises error if part has no drawing. |
| `getProjectBomUploadUrl` | `projectId: String!`, `filename: String!` | `ProjectBomUploadUrlType` | **Project-level.** Get a presigned S3 upload URL for a BOM file scoped to a project (no fixture needed). Returns `uploadUrl`, `s3Key`, `projectId`. PUT the file bytes to `uploadUrl`, then call `parseProjectBomFile`. |
| `parseProjectBomFile` | `projectId: String!`, `s3Key: String!` | `BomParseResultType` | **Project-level.** Parse BOM — fixture number is read from the Excel (cell below the cell containing "fixture"). Validates: (1) fixture number cell exists, (2) drawings belong to the declared fixture. Each manufactured part includes `fixtureSeq`, `fixtureExists`, `existingFixtureId`, `existingFixtureNumber`, `isDuplicateInProject`, `duplicateFixtures`. Each standard part includes `fixtureSeq` (from Excel header, so UI can group standard parts under the correct fixture). Summary includes `bomFixtureSeq`, `duplicateDrawingCount`, `fixtureMismatchCount`, `newFixtureSeqs`, `existingFixtureSeqs`. No DB writes. |

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
| `setModuleEnabled` | `moduleId: String!`, `enabled: Boolean!` | `ModuleStatusType` | Enable or disable a module (DB-driven). Requires update permission on `role` entity. |

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
| `createProduct` | `input: ProductInput!` (name, categoryId, partNo, description, make, unitId, quantity, isActive) | `ProductType` | Create product. |
| `updateProduct` | `id: String!`, `input: ProductInput!` | `ProductType` | Update product by id. |
| `deleteProduct` | `id: String!` | `Boolean!` | Delete product by id. |

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
| `submitBomUpload` | `input: BomSubmitInput!` (fixtureId, s3Key, filename, wrongEntryResolutions, productMatchResolutions) | `FixtureType` | **Fixture-level (legacy).** Commit a parsed BOM file to a specific fixture. Stores manufactured parts, uploads drawing files from ZIP, and links standard parts to Product master. |
| `submitProjectBomUpload` | `input: ProjectBomSubmitInput!` (projectId, s3Key, filename, wrongEntryResolutions, productMatchResolutions) | `[FixtureType!]!` | **Project-level (preferred).** Commit a parsed BOM to the project. Fixtures are auto-created/matched from fixture sequences in drawing numbers. Duplicate drawings (already committed for the same project) are skipped. Returns the list of affected fixtures. |

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
  users(skip: 0, limit: 10) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive roles
    }
    total skip limit page totalPages hasMore
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
# 14. Product categories list
query {
  productCategories(skip: 0, limit: 100, isActive: true) {
    items { id categoryName parentId parentName isActive }
    total
  }
}

# 15. Single product category
query {
  productCategory(id: "CATEGORY_UUID") {
    id categoryName parentId parentName isActive
  }
}

# 16. Customers list (with audit fields and creator/modifier usernames)
query {
  customers(skip: 0, limit: 50, isActive: true) {
    items {
      id name code address contactInfo
      primaryContactName primaryContactEmail primaryContactMobile
      secondaryContactName secondaryContactEmail secondaryContactMobile
      isActive createdAt modifiedAt createdBy createdByUsername modifiedBy modifiedByUsername
    }
    total
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

# 17. Products list (optional filter by categoryId)
query {
  products(skip: 0, limit: 50, categoryId: null, isActive: true) {
    items { id name categoryId partNo description make unitId unitName quantity isActive }
    total
  }
}

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
    createdAt createdByUsername
  }
}

# 22. BOM view (full committed BOM for a fixture, with optional search filters)
query BomView(
  $fixtureId: String!,
  $drawingNo: String,
  $drawingDesc: String,
  $stdPartNo: String,
  $stdName: String,
  $stdMake: String
) {
  bomView(
    fixtureId: $fixtureId
    drawingNoContains: $drawingNo
    drawingDescriptionContains: $drawingDesc
    standardPartPartNoContains: $stdPartNo
    standardPartNameContains: $stdName
    standardPartMakeContains: $stdMake
  ) {
    fixture { id fixtureNumber status bomUploadedAt }
    manufacturedParts {
      id fixtureId srNo drawingNo description qtyLh qtyRh status
      fixtureSeq unitSeq partSeq drawingFileS3Key
    }
    standardParts {
      id fixtureId productId srNo unitId
      partNo productName productMake
      qty           # expected quantity from BOM line item
      currentStock  # Product.quantity from product master
      purchaseQty   # max(0, qty - currentStock) — how many to procure
    }
  }
}
# Example variables:
# {
#   "fixtureId": "FIXTURE_UUID",
#   "drawingNo": "S25049001",
#   "drawingDesc": null,
#   "stdPartNo": "ISO-4762",
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
query {
  parseBomFile(fixtureId: "FIXTURE_UUID", s3Key: "bom-uploads/...") {
    manufacturedParts {
      srNo drawingNo description qtyLh qtyRh
      isWrongEntry wrongEntryReason
      fixtureSeq unitSeq partSeq parsedDrawingNo hasDrawing
      # New: duplicate detection within the same project
      isDuplicateInProject
      duplicateFixtures { id fixtureNumber }
    }
    standardParts {
      srNo partNumber description make qty unit
      similarProducts { id partNo name make }
    }
    wrongEntries { rowNum srNo rawValue reason }
    summary { totalManufactured totalStandard wrongEntryCount }
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

# 27. Project-level parse BOM (fixture number from Excel, standard parts grouped by fixture)
query ParseProjectBomFile($projectId: String!, $s3Key: String!) {
  parseProjectBomFile(projectId: $projectId, s3Key: $s3Key) {
    summary {
      totalManufactured totalStandard wrongEntryCount
      bomFixtureSeq fixtureMismatchCount
      duplicateDrawingCount newFixtureSeqs existingFixtureSeqs
    }
    manufacturedParts {
      srNo drawingNo description qtyLh qtyRh
      isWrongEntry wrongEntryReason
      fixtureSeq unitSeq partSeq parsedDrawingNo hasDrawing
      isDuplicateInProject duplicateFixtures { id fixtureNumber }
      fixtureExists existingFixtureId existingFixtureNumber
    }
    standardParts {
      srNo partNumber description make qty unit fixtureSeq
      similarProducts { id partNo name make }
    }
    wrongEntries { rowNum srNo rawValue reason }
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
    partNo: "WGT-001"
    unitId: "UOM_UUID"
    isActive: true
  }) {
    id name categoryId partNo description make unitId unitName quantity isActive
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
# Step 3: parseBomFile → review, resolve wrong entries and product matches
# Step 4: submitBomUpload
mutation {
  submitBomUpload(input: {
    fixtureId: "FIXTURE_UUID"
    s3Key: "bom-uploads/FIXTURE_UUID/BOM.zip"
    filename: "BOM.zip"
    wrongEntryResolutions: [
      {
        originalDrawingNo: "S250490010301"
        action: "skip"
      }
    ]
    productMatchResolutions: [
      {
        partNumber: "BOLT-M12"
        productId: "PRODUCT_UUID"
      }
    ]
  }) {
    id fixtureNumber status s3BomKey bomFilename bomUploadedAt
  }
}

# 24. Project-level BOM submit (preferred for UI "Upload BOM" on a project row)
# Step 1: getProjectBomUploadUrl → get uploadUrl + s3Key (project-scoped, no fixture needed)
# Step 2: PUT file bytes to uploadUrl
# Step 3: parseProjectBomFile → review (fixture IDs derived from drawing numbers, duplicates flagged)
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
#     "productMatchResolutions": [
#       { "partNumber": "ISO-4762-M6x20", "productId": "PRODUCT_UUID" }
#     ]
#   }
# }
```

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

**Basic Query:**
```graphql
query {
  users(skip: 0, limit: 10) {
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
          "roles": ["admin"]
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
          "roles": ["manager"]
        }
      ],
      "total": 3,
      "skip": 0,
      "limit": 10,
      "page": 1,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

**Pagination Parameters:**
- `skip`: Number of items to skip (default: 0, min: 0)
- `limit`: Items per page (default: 100, min: 1, max: 1000)

**Large Dataset Query:**
```graphql
query {
  users(skip: 0, limit: 1000) {
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
    hasMore
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
- Returns ALL entities from the master registry (`app/entity_registry.py`), not just those with permissions
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
  users(skip: 0, limit: 10) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive roles
    }
    total
    page
    totalPages
    hasMore
  }
}
```

**Second Page:**
```graphql
query {
  users(skip: 10, limit: 10) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive roles
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
  users(skip: 0, limit: 20) {
    items { id firstName lastName dateOfBirth mobileNumber username email isActive roles }
    total
    hasMore
  }
}
```

**Load More (if hasMore = true):**
```graphql
query {
  users(skip: 20, limit: 20) {
    items { id firstName lastName dateOfBirth mobileNumber username email isActive roles }
    hasMore
  }
}
```

### Large Dataset Handling

**Load 1000 items:**
```graphql
query {
  users(skip: 0, limit: 1000) {
    items {
      id firstName lastName dateOfBirth mobileNumber username email isActive roles
    }
    total
    hasMore
  }
}
```

### Pagination Calculation

```javascript
// Calculate skip value for page navigation
const page = 3;  // Target page (1-indexed)
const limit = 50;
const skip = (page - 1) * limit;  // skip = 100

// Query
const query = `
  query {
    users(skip: ${skip}, limit: ${limit}) {
      items { id firstName lastName dateOfBirth mobileNumber username email isActive roles }
      total
      page
      totalPages
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
async function fetchUsers(skip = 0, limit = 10) {
  const query = `
    query {
      users(skip: ${skip}, limit: ${limit}) {
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
  query GetUsers($skip: Int!, $limit: Int!) {
    users(skip: $skip, limit: $limit) {
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
    }
  }
`;

function UsersList() {
  const [page, setPage] = React.useState(1);
  const limit = 10;
  const skip = (page - 1) * limit;
  
  const { loading, error, data } = useQuery(GET_USERS, {
    variables: { skip, limit }
  });
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  const { items, total, totalPages, hasMore } = data.users;
  
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
  query GetUsers($skip: Int!, $limit: Int!) {
    users(skip: $skip, limit: $limit) {
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
    }
  }
`;

const page = ref(1);
const limit = 10;
const skip = computed(() => (page.value - 1) * limit);

const { result, loading, error } = useQuery(GET_USERS, () => ({
  skip: skip.value,
  limit: limit
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
    
    def get_users(self, skip: int = 0, limit: int = 10) -> Dict[str, Any]:
        """Get paginated users (all user fields)"""
        query = '''
        query {
          users(skip: %d, limit: %d) {
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
          }
        }
        ''' % (skip, limit)
        
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
  users(skip: 0, limit: 10) {
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
  users(skip: 0, limit: 10) {
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
- Pagination up to 1000 items per page (list queries); Master Data list limits vary (e.g. products 100, productCategories 500).

✅ **Queries (single source of truth: this document)**

**Core:** `hello`, `getEnumEntities`, `getEnumFields`, `enabledModules`, `currentUser`, `user`, `users`, `getRoles`, `getRolePermissions`, `myPermissions`, `entities`, `entityFields`.

**Project Management & Design/BOM (require module `project_management` enabled):** `projects`, `project`, `projectAssignments`, `projectAssignmentBoard`, `fixtures`, `fixture`, `bomView`, `getDesignUploadUrl`, `parseBomFile`, `getDrawingViewUrl`, `getProjectBomUploadUrl`, `parseProjectBomFile`.

**Master Data (require module `master_data` enabled):** `productCategories`, `productCategory`, `customers`, `customer`, `uomList`, `uom`, `taxList`, `tax`, `paymentTermsList`, `paymentTerm`, `expenseCategoriesList`, `expenseCategory`, `suppliers`, `supplier`, `vendors`, `vendor`, `products`, `product`.

✅ **Mutations (single source of truth: this document)**

**Core:** `login`, `refresh`, `createUser`, `updateUser`, `changePassword`, `setUserPassword`, `deleteUser`, `deleteRole`, `addUserRole`, `removeUserRole`, `upsertRoleWithPermissions`, `setModuleEnabled`.

**Project Management & Design/BOM (require module `project_management` enabled):** `createProject`, `updateProject`, `deleteProject`, `assignProjectPrincipal`, `removeProjectPrincipal`, `createFixture`, `updateFixture`, `deleteFixture`, `submitBomUpload`, `submitProjectBomUpload`.

**Master Data (require module `master_data` enabled):** `createProductCategory`, `updateProductCategory`, `deleteProductCategory`, `createCustomer`, `updateCustomer`, `deleteCustomer`, `createUOM`, `updateUOM`, `deleteUOM`, `createTax`, `updateTax`, `deleteTax`, `createPaymentTerm`, `updatePaymentTerm`, `deletePaymentTerm`, `createExpenseCategory`, `updateExpenseCategory`, `deleteExpenseCategory`, `createSupplier`, `updateSupplier`, `deleteSupplier`, `createVendor`, `updateVendor`, `deleteVendor`, `createProduct`, `updateProduct`, `deleteProduct`.

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
