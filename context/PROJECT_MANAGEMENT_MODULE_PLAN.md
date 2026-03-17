No roles yet# Project Management Module — Implementation Plan

**Recommended next module:** ✅ **Project Management**  
**Module ID:** `project_management`  
**Status:** Not started  
**Depends on:** Core ✅, Master Data ✅

---

## Why Project Management Next?

From the dependency chain defined in `MODULAR_MODULES_PROPOSAL.md`:

```
Core ✅ → Master Data ✅ → Project Management ← YOU ARE HERE
                            ↓
                        Design & BOM → Procurement → Manufacturing
                            → Quality → Inventory → Assembly → CMM → Dispatch
```

Project is the **anchor entity** for every downstream module. Design & BOM attaches fixtures to a project; Procurement attaches POs to a project; Manufacturing, Quality, Assembly, CMM, Dispatch all operate in the context of a project. Nothing after this point is buildable without it.

---

## BRD / SRS Coverage

| BRD Ref | Description |
|---------|-------------|
| BR-PM-001 | Project lifecycle: Open, In Progress, On Hold, Completed, Cancelled |
| BR-PM-002 | Auto-generate project codes: `PRJ-YYYYMMDD-XXX` |
| BR-PM-003 | Timeline tracking, remaining days, color indicators |
| BR-PM-004 | Role assignment to projects |

| SRS Ref | Description |
|---------|-------------|
| FR-PM-001 | Auto-generate project codes `PRJ-YYYYMMDD-XXX` |
| FR-PM-002 | Accept project number (user input) during creation |
| FR-PM-003 | Project statuses: Open, In Progress, On Hold, Completed, Cancelled |
| FR-PM-004 | Start date, overall target date, actual delivery date |
| FR-PM-005 | Role-specific target dates (all except CMM and Accounts) |
| FR-PM-006 | Remaining days = target date − today |
| FR-PM-007 | Color coding: Green <30d, Orange 30–60d, Red >60d |
| FR-PM-008 | Actual delivery date editable by Owner role only |
| FR-PM-009 | Expandable/collapsible project hierarchy (frontend concern, data provided via API) |

---

## DB Schema Design

### Table: `projects`

| Column | Type | Notes |
|--------|------|-------|
| id | String(36) PK | UUID |
| project_code | String(30) UNIQUE | Auto-generated: `PRJ-YYYYMMDD-XXX` |
| project_number | String(50) | User-supplied project number |
| name | String(255) NOT NULL | Project name |
| customer_id | String(36) FK → customers | Nullable, references customers table |
| description | Text | Optional |
| status | String(50) | Enum: open, in_progress, on_hold, completed, cancelled |
| start_date | Date | |
| target_date | Date | Overall target date |
| actual_delivery_date | Date | Nullable; Owner-only write |
| budget | Numeric(18,2) | Project budget (Owner / PM visible) |
| purchase_budget | Numeric(18,2) | Purchase budget (Owner / PM / Procurement visible) |
| designer_target_date | Date | Nullable; FR-PM-005 |
| procurement_target_date | Date | Nullable |
| manufacturing_target_date | Date | Nullable |
| quality_target_date | Date | Nullable |
| assembly_target_date | Date | Nullable |
| is_active | Boolean default True | |
| AuditMixin | | created_at, modified_at, created_by, modified_by, is_deleted |

### Table: `project_assignments`

| Column | Type | Notes |
|--------|------|-------|
| id | String(36) PK | UUID |
| project_id | String(36) FK → projects | ON DELETE CASCADE |
| principal_type | String(20) | `user` or `role` |
| principal_id | String(36) | user.id or role.id |
| access_level | String(20) | Optional: viewer/editor/owner |
| assigned_at | DateTime | Auto-set on insert |
| assigned_by | String(36) FK → users | Nullable |

---

## Task Breakdown

### TASK-01 — Domain: Status and Role Enums
**File:** `app/domain/enums.py`  

- Add `ProjectStatusEnum` with values:
  - `OPEN = "open"`
  - `IN_PROGRESS = "in_progress"`
  - `ON_HOLD = "on_hold"`
  - `COMPLETED = "completed"`
  - `CANCELLED = "cancelled"`

- Add `ProjectRoleEnum` with values:
  - `DESIGNER = "designer"`
  - `PROJECT_MANAGER = "project_manager"`
  - `PROCUREMENT = "procurement"`
  - `MANUFACTURING = "manufacturing"`
  - `QUALITY = "quality"`
  - `STORE = "store"`
  - `ASSEMBLY = "assembly"`
  - `CMM = "cmm"`
  - `ACCOUNTS = "accounts"`

- Add `ProjectFieldsEnum` (all columns of `projects` table as snake_case strings).

- Add `ProjectAssignmentFieldsEnum` (all columns of `project_assignments` table).

- Register both in `ENTITY_FIELD_ENUMS` dict:
  ```python
  "project": ProjectFieldsEnum,
  "project_assignment": ProjectAssignmentFieldsEnum,
  ```

---

### TASK-02 — Infrastructure: ORM Models
**File:** `app/infrastructure/models.py`

- Add `Project(Base, AuditMixin)` with all columns from schema design above.
- Add `ProjectAssignment(Base, AuditMixin)` with all columns from schema design above.
- Add relationship: `Project.assignments = relationship("ProjectAssignment", back_populates="project", cascade="all, delete-orphan")`
- Add FK relationship: `Project.customer = relationship("Customer", backref="projects")`
- Import `Date, Numeric` from `sqlalchemy` as needed.

---

### TASK-03 — Infrastructure: Alembic Migration (`020`)
**File:** `alembic/versions/20240101_000020_add_project_management.py`

- `revision = '020'`, `down_revision = '019'`
- `upgrade()`:
  - Create table `projects` with all columns
  - Create table `project_assignments` with all columns
  - Add indexes: `projects.project_code`, `projects.customer_id`, `projects.status`, `project_assignments.project_id`, `project_assignments.principal_type`, `project_assignments.principal_id`
- `downgrade()`:
  - Drop `project_assignments` first (FK dep)
  - Drop `projects`

---

### TASK-04 — Module File
**File:** `app/modules/project.py`

```python
from app.domain.registry import register_entity
MODULE_ID = "project_management"

def _register():
    register_entity("project", "Project", "Project lifecycle management", module_id=MODULE_ID)
  register_entity("project_assignment", "Project Assignment", "Project user/role assignments", module_id=MODULE_ID)

_register()
```

- Update `app/modules/__init__.py`:
  ```python
  from app.modules import project  # noqa: F401
  ```

- Update `module_registry` seed / insert script (or add a new migration step) to insert `project_management` row into `module_registry` table with `enabled=True`.

---

### TASK-05 — Application: Project Code Generator Helper
**File:** `app/application/services/project_service.py` (new file)

Implement a helper function:
```python
def generate_project_code(db: Session) -> str:
    """Generate next code in format PRJ-YYYYMMDD-XXX (sequential per day)."""
```

Logic:
- Prefix = `PRJ-{today:%Y%m%d}-`
- Query `SELECT MAX(project_code) FROM projects WHERE project_code LIKE prefix%`
- Parse last 3-digit sequence, increment, zero-pad to 3 digits
- Return `PRJ-20260313-001`, `PRJ-20260313-002`, etc.

---

### TASK-06 — Application: Project Service (CRUD)
**File:** `app/application/services/project_service.py`

Implement all service functions following the same patterns as `master_data_service.py`:

```python
def list_projects(db, current_user, skip, limit, status, customer_id, active_only) -> dict
def get_project(db, current_user, id) -> Optional[Project]
def create_project(db, current_user, name, project_number, customer_id, description,
                   status, start_date, target_date, budget, purchase_budget,
                   designer_target_date, procurement_target_date, manufacturing_target_date,
                   quality_target_date, assembly_target_date,
                   is_active, created_by) -> Project
def update_project(db, current_user, id, name, project_number, customer_id, description,
                   status, start_date, target_date, actual_delivery_date,
                   budget, purchase_budget, designer_target_date, procurement_target_date,
                   manufacturing_target_date, quality_target_date,
                   assembly_target_date, is_active, modified_by) -> Optional[Project]
def delete_project(db, current_user, id, soft_delete, modified_by) -> bool
```

Permission checks:
- All operations check entity permission for `"project"` (read/create/update/delete).
- `actual_delivery_date` is accepted as a parameter; **field-level write permission** for `actual_delivery_date` controls whether it can be set (only Owner role gets write=True on this field via seed).
- Auto-generate `project_code` on create using helper.
- Filter list by `status` and/or `customer_id` if provided.
- Include soft-delete guard (`is_deleted == False`).

---

### TASK-07 — Application: Project Assignment Service
**File:** `app/application/services/project_service.py` (continued)

```python
def list_project_assignments(db, current_user, project_id) -> List[ProjectAssignment]
def get_project_assignment_board(db, current_user, project_id) -> dict
def assign_project_principal(db, current_user, project_id, principal_type, principal_id, access_level, assigned_by) -> ProjectAssignment
def remove_project_principal(db, current_user, project_id, principal_type, principal_id, modified_by) -> bool
```

Permission checks:
- Read assignments: requires `project_assignment` read permission.
- Assignment screen access: requires `project_assignment` update permission.
- Assign / remove: requires `project_assignment` update permission.
- Validate that `project_id` exists and is not deleted.
- Validate principal existence by type (`user` -> users table, `role` -> roles table).
- Prevent duplicate assignment of the same (`project_id`, `principal_type`, `principal_id`).

---

### TASK-08 — GraphQL: Types
**File:** `app/api/graphql/types_project.py` (new file)

Define Strawberry types following the same patterns as `types_master_data.py`:

```python
@strawberry.type
class ProjectType:
    id: str
    project_code: str
    project_number: Optional[str]
    name: str
    customer_id: Optional[str]
    # customer_name resolved via strawberry.field resolver (lookup customer name)
    description: Optional[str]
    status: str
    start_date: Optional[date]
    target_date: Optional[date]
    actual_delivery_date: Optional[date]
    budget: Optional[float]
    purchase_budget: Optional[float]
    designer_target_date: Optional[date]
    procurement_target_date: Optional[date]
    manufacturing_target_date: Optional[date]
    quality_target_date: Optional[date]
    assembly_target_date: Optional[date]
    is_active: bool
    created_at / modified_at / created_by / modified_by (AuditMixin fields)
    created_by_username / modified_by_username (resolved)
    
    @strawberry.field(name="remainingDays")
    def remaining_days(self) -> Optional[int]:
        # target_date - today

    @strawberry.field(name="customerName")
    def customer_name_resolver(self, info) -> Optional[str]:
        # resolve from customer table

    @staticmethod
    def from_model(m: Project) -> "ProjectType": ...

@strawberry.type
class ProjectListType:
    items: List[ProjectType]
    total: int
    id: Optional[str] = None
    skip: int = 0
    limit: int = 0
    page: int = 1
    total_pages: int = 0
    has_more: bool = False

@strawberry.type
class ProjectAssignmentType:
    id: str
    project_id: str
  principal_type: str
  principal_id: str
  access_level: Optional[str]
    assigned_at: Optional[datetime]
    assigned_by: Optional[str]
  assigned_by_username: Optional[str]

    @staticmethod
    def from_model(m: ProjectAssignment) -> "ProjectAssignmentType": ...

@strawberry.input
class ProjectInput:
    name: str
    project_number: Optional[str] = None
    customer_id: Optional[str] = None
    description: Optional[str] = None
    status: str = "open"
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    budget: Optional[float] = None
    purchase_budget: Optional[float] = None
    designer_target_date: Optional[date] = None
    procurement_target_date: Optional[date] = None
    manufacturing_target_date: Optional[date] = None
    quality_target_date: Optional[date] = None
    assembly_target_date: Optional[date] = None
    is_active: bool = True

@strawberry.input
class ProjectAssignmentInput:
    project_id: str
  principal_type: str
  principal_id: str
  access_level: Optional[str] = None
```

---

### TASK-09 — GraphQL: Queries
**File:** `app/api/graphql/queries.py`

Add under a `require_module(info, "project_management")` guard:

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `projects` | `skip`, `limit`, `status`, `customerId`, `isActive` | `ProjectListType!` | Paginated project list. Requires `project` read permission. |
| `project` | `id: String!` | `ProjectType` | Single project by id. |
| `projectAssignments` | `projectId: String!` | `[ProjectAssignmentType!]!` | All role assignments for a project. |
| `projectAssignmentBoard` | `projectId: String!` | `ProjectAssignmentBoardType` | Assignment screen payload. Requires `project_assignment` update permission. |

---

### TASK-10 — GraphQL: Mutations
**File:** `app/api/graphql/mutations.py`

Add under a `require_module(info, "project_management")` guard:

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `createProject` | `input: ProjectInput!` | `ProjectType` | Create project. Requires `project` create permission. Auto-generates `projectCode`. |
| `updateProject` | `id: String!`, `input: ProjectInput!` | `ProjectType` | Update project. Requires `project` update permission. `actualDeliveryDate` respects field-level write permission. |
| `deleteProject` | `id: String!`, `softDelete: Boolean = true` | `Boolean!` | Delete project. Requires `project` delete permission. |
| `assignProjectPrincipal` | `input: ProjectAssignmentInput!` | `ProjectAssignmentType` | Assign a user or role principal to a project. Requires `project_assignment` update permission. |
| `removeProjectPrincipal` | `projectId: String!`, `principalType: String!`, `principalId: String!` | `Boolean!` | Remove a project principal assignment. Requires `project_assignment` update permission. |

---

### TASK-11 — Seed: Superadmin Permissions for `project` entity
**File:** `add_superadmin_user_permissions.py` (or a dedicated `insert_project_permissions.py` script)

Add entity permission (create/read/update/delete = True) for superadmin and admin roles on:
- `project`
- `project_assignment`

Add field permissions for `actual_delivery_date`:
- `superadmin` / `admin` (Owner): `can_write = True`
- All other roles: `can_write = False` (read-only)

Add field permissions for cost fields (`budget`, `purchase_budget`):
- `superadmin`, `admin`, `project_manager`, `accounts`: `can_read = True`
- `procurement`: `can_read = True` for `purchase_budget` only
- All other roles: `can_read = False`

---

### TASK-12 — Module Registry: Add `project_management` Row
Ensure a row exists in `module_registry`:
```
module_id    = 'project_management'
enabled      = true
display_name = 'Project Management'
description  = 'Project lifecycle, timelines, role assignments'
```

Either via:
- A new Alembic data migration (add as part of the migration `020` upgrade), **or**
- An `INSERT` in the existing `insert_roles.py` / seed script.

Recommended: add in migration `020` `upgrade()` as:
```python
op.execute(sa.text("""
    INSERT INTO module_registry (module_id, enabled, display_name, description)
    VALUES ('project_management', true, 'Project Management',
            'Project lifecycle, timelines, role assignments')
    ON CONFLICT (module_id) DO NOTHING
"""))
```

---

### TASK-13 — Docs: Update `BACKEND_IMPLEMENTATION_STATE.md`

Add Project Management entries to the reference tables:

**Queries section** — add:
- `projects`, `project`, `projectAssignments`, `projectAssignmentBoard`

**Mutations section** — add:
- `createProject`, `updateProject`, `deleteProject`, `assignProjectPrincipal`, `removeProjectPrincipal`

Update **Summary** section to list `project_management` as an enabled module.

---

## Implementation Order (Suggested)

```
TASK-01  Domain enums
TASK-02  ORM models
TASK-03  Alembic migration + run: alembic upgrade head
TASK-04  Module file + __init__.py import
TASK-05  Code generator helper
TASK-06  Project CRUD service
TASK-07  Project Assignment service
TASK-08  GraphQL types (new file: types_project.py)
TASK-09  GraphQL queries
TASK-10  GraphQL mutations
TASK-11  Seed permissions script / migration
TASK-12  Module registry row (in migration 020)
TASK-13  Docs update
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Role-specific target dates | Columns on `projects` table | Simpler queries, no extra join for list view; max 6 date columns |
| `actual_delivery_date` write guard | Field-level permission `actual_delivery_date` canWrite | Consistent with existing field-permission system; no special code path |
| Cost field visibility | Field-level permissions on `budget`, `purchase_budget` | Same mechanism as all other sensitive fields; permission UI controls it |
| Project code sequence | DB MAX per day prefix | Avoids race conditions with SELECT FOR UPDATE or atomic DB query; acceptable for expected volume |
| `project_assignments` table | Separate join table | Enables multiple roles per user per project; supports future role-history |
| Customer FK | Nullable | Projects may exist before customer is assigned |
| Module guard | `require_module(info, "project_management")` | Consistent with `master_data` module guard pattern |

---

## Files to Create / Modify

| Action | File |
|--------|------|
| **Modify** | `app/domain/enums.py` |
| **Modify** | `app/infrastructure/models.py` |
| **Create** | `alembic/versions/20240101_000020_add_project_management.py` |
| **Create** | `app/modules/project.py` |
| **Modify** | `app/modules/__init__.py` |
| **Create** | `app/application/services/project_service.py` |
| **Create** | `app/api/graphql/types_project.py` |
| **Modify** | `app/api/graphql/queries.py` |
| **Modify** | `app/api/graphql/mutations.py` |
| **Modify** | `add_superadmin_user_permissions.py` (or create `insert_project_permissions.py`) |
| **Modify** | `context/BACKEND_IMPLEMENTATION_STATE.md` |

**Total: 5 new files, 6 modified files.**

---

## GraphQL API Summary (Post-Implementation)

### Queries

| Query | Auth | Module Guard |
|-------|------|--------------|
| `projects(skip, limit, status, customerId, isActive)` | ✅ | project_management |
| `project(id)` | ✅ | project_management |
| `projectAssignments(projectId)` | ✅ | project_management |
| `projectAssignmentBoard(projectId)` | ✅ assignment-write | project_management |

### Mutations

| Mutation | Auth | Module Guard |
|----------|------|--------------|
| `createProject(input: ProjectInput!)` | ✅ create | project_management |
| `updateProject(id, input: ProjectInput!)` | ✅ update | project_management |
| `deleteProject(id, softDelete)` | ✅ delete | project_management |
| `assignProjectPrincipal(input: ProjectAssignmentInput!)` | ✅ assignment-write | project_management |
| `removeProjectPrincipal(projectId, principalType, principalId)` | ✅ assignment-write | project_management |

---

*Ready to implement — start with TASK-01.*
