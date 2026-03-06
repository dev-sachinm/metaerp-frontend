# METAERP Project Context

> **Purpose**: This document provides complete project context for AI assistants (Copilot, Claude, etc.)
> **Keep this file at**: `docs/PROJECT_CONTEXT.md` or `.github/copilot-instructions.md`

---

## 1. Project Overview

**METAERP** is a multi-tenant ERP platform for manufacturing companies in robotics, automation, and mechanical engineering sectors. It manages the complete project lifecycle from design to dispatch.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18+ (Vite) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Authentication | JWT + OAuth (Google/Microsoft) |
| Authorization | RBAC + Field-Level Security |

### Frontend Tech Stack (Complete)

```
Core:
├── React 18+              # UI library
├── Vite                   # Build tool (fast HMR)
├── TypeScript             # Type safety
├── React Router           # Navigation/routing
├── TanStack Query         # Server state management (API caching)
├── Zustand                # Global client state
├── React Hook Form        # Form handling
├── Zod                    # Schema validation
├── TanStack Table         # Data tables (sorting, filtering, pagination)
└── Axios                  # HTTP client

UI Foundation:
├── Tailwind CSS           # Utility-first CSS
├── shadcn/ui              # Base components (buttons, modals, dropdowns, forms)
├── Lucide React           # Icons (works with shadcn)
├── Sonner                 # Toast notifications
├── cmdk                   # Command palette (⌘+K)
├── Framer Motion          # Animations
└── React DayPicker        # Date picker (or shadcn Calendar)
```

---

## 2. User Roles (10 Roles)

| Role | Scope/Interest | Key Responsibilities |
|------|----------------|---------------------|
| **Operations Head (Owner)** | Overall business oversight, strategic decisions | Complete visibility, financial tracking, user management |
| **Project Managers** | Project execution and coordination | Timeline tracking, resource allocation, status updates, project budget tracking |
| **Design Team** | Create and manage design packages | BOM upload, version control, drawing management |
| **Procurement Team** | Supplier, Vendor management, PO creation | Cost tracking, vendor/supplier selection, PO creation |
| **Manufacturing Team** | Production coordination | Track Part manufacturing, vendor coordination, status updates |
| **Quality Team** | Quality assurance and inspection | Inspection tracking, quality status updates |
| **Store/Inventory** | Inventory management | Stock levels, receipt tracking, location management |
| **Assembly Team** | Fixture assembly | Parts availability tracking, assembly tracking, issue reporting |
| **CMM Operators** | Precision measurement | Inspection workflows, confirmation tracking |
| **Accounts Team** | Financial operations | Invoice generation, cost visibility, payment tracking |

---

## 3. Cost Visibility Matrix

| Role | Total Cost | Purchase Budget | Cost Breakdown | Project Budget |
|------|------------|-----------------|----------------|----------------|
| Operations Head (Owner) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Project Managers | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| Design Team | ❌ No | ❌ No | ❌ No | ❌ No |
| Procurement Team | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| Manufacturing Team | ❌ No | ❌ No | ❌ No | ❌ No |
| Quality Team | ❌ No | ❌ No | ❌ No | ❌ No |
| Store/Inventory | ❌ No | ❌ No | ❌ No | ❌ No |
| Assembly Team | ❌ No | ❌ No | ❌ No | ❌ No |
| CMM Operators | ❌ No | ❌ No | ❌ No | ❌ No |
| Accounts Team | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 4. Core Entities/Models

### Project
- `project_code`: Auto-generated (PRJ-YYYYMMDD-XXX)
- `project_number`: 5-char identifier (e.g., S25049)
- `status`: Open → In Progress → On Hold → Completed/Cancelled
- `start_date`, `target_date`, `actual_delivery_date`
- `budget`: Project budget (restricted visibility)

### Fixture
- `fixture_number`: Derived from project (e.g., S25049-001)
- `version`: Starts at 1.0, increments with revisions/ECNs
- `status`: Design Pending → Design In Progress → Procurement In Progress → Assembly Completed → CMM Confirmed → Dispatched
- Dispatch flags: `painting_completed`, `packaging_completed`, `transportation_booked`, `insured`

### Fixture Parts (BOM)
- Two types: **Manufactured parts** (Drawing No.) and **Standard parts** (Part No.)
- `qty_lh`, `qty_rh`: Left-hand and right-hand quantities
- `cost_breakdown`: JSONB with multiple cost labels
- `cost_per_piece`: Sum of all cost labels
- `total_cost`: (qty_lh + qty_rh) × cost_per_piece
- `status`: Pending → Inprogress → Quality Checked → Received

### Standard Part List
- Linked at **project level** (shared across fixtures)
- `required_qty`, `store_qty`, `purchase_qty` (calculated: required - store)

---

## 5. Database Schema - Authorization

```sql
-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'local',  -- 'local', 'google', 'microsoft'
    auth_provider_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- User-Role mapping (many-to-many)
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Entity registry
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Field registry per entity
CREATE TABLE entity_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50),
    is_sensitive BOOLEAN DEFAULT FALSE,
    UNIQUE(entity_id, field_name)
);

-- Entity-level permissions (RBAC)
CREATE TABLE role_entity_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_list BOOLEAN DEFAULT FALSE,
    row_filter JSONB,
    UNIQUE(role_id, entity_id)
);

-- Field-level permissions
CREATE TABLE role_field_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    field_id UUID REFERENCES entity_fields(id) ON DELETE CASCADE,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    UNIQUE(role_id, field_id)
);

-- User-specific overrides (exceptions)
CREATE TABLE user_field_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    field_id UUID REFERENCES entity_fields(id) ON DELETE CASCADE,
    can_read BOOLEAN,
    can_write BOOLEAN,
    UNIQUE(user_id, field_id)
);
```

---

## 6. Authentication Strategy

### Token Strategy
- **Access Token**: JWT, stored in memory (Zustand), short-lived (15-30 min)
- **Refresh Token**: Stored in httpOnly cookie, long-lived (7 days)

### OAuth Providers
- Google OAuth 2.0
- Microsoft OAuth 2.0

### Auth Flow
1. User logs in (email/password or OAuth)
2. Backend validates and returns access token + sets refresh token cookie
3. Frontend stores access token in memory (Zustand)
4. API calls include Bearer token in Authorization header
5. On 401, frontend uses refresh token to get new access token

---

## 7. Frontend Architecture (Feature-Sliced Design)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  app/        → Initialization, providers, routing           │
├─────────────────────────────────────────────────────────────┤
│  pages/      → Route components (thin, compose widgets)     │
├─────────────────────────────────────────────────────────────┤
│  widgets/    → Complex UI blocks (combine multiple features)│
├─────────────────────────────────────────────────────────────┤
│  features/   → Business logic (API, hooks, domain components)│
├─────────────────────────────────────────────────────────────┤
│  entities/   → Business entities (types, minimal UI)        │
├─────────────────────────────────────────────────────────────┤
│  shared/     → Reusable, no business logic (UI, utils)      │
└─────────────────────────────────────────────────────────────┘

        ↑ Higher layers can import from lower layers
        ↓ Lower layers CANNOT import from higher layers
```

### Import Rules

```typescript
// ✅ ALLOWED
// pages/ can import from widgets/, features/, entities/, shared/
// widgets/ can import from features/, entities/, shared/
// features/ can import from entities/, shared/
// entities/ can import from shared/

// ❌ FORBIDDEN
// shared/ cannot import from features/
// features/ cannot import from widgets/
// entities/ cannot import from features/
```

### Complete Folder Structure

```
src/
│
├── app/                        # Application layer (initialization, providers)
│   ├── providers/              # All context providers wrapped
│   │   ├── index.tsx           # Combines all providers
│   │   ├── auth-provider.tsx
│   │   ├── query-provider.tsx
│   │   └── theme-provider.tsx
│   ├── router/                 # Route configuration
│   │   ├── index.tsx
│   │   ├── routes.tsx          # Route definitions
│   │   ├── protected-route.tsx
│   │   └── role-guard.tsx      # Role-based route protection
│   ├── styles/                 # Global styles
│   │   └── globals.css
│   └── index.tsx               # App entry point
│
├── pages/                      # Page components (route endpoints)
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── oauth-callback.tsx
│   │   └── forgot-password.tsx
│   ├── dashboard/
│   │   └── index.tsx
│   ├── projects/
│   │   ├── index.tsx           # Project list
│   │   ├── [id]/
│   │   │   ├── index.tsx       # Project detail
│   │   │   ├── fixtures.tsx    # Project fixtures tab
│   │   │   └── settings.tsx    # Project settings tab
│   │   └── new.tsx             # Create project
│   ├── fixtures/
│   │   ├── index.tsx
│   │   ├── [id]/
│   │   │   ├── index.tsx       # Fixture detail
│   │   │   ├── parts.tsx       # BOM tab
│   │   │   └── history.tsx     # Version history tab
│   │   └── upload.tsx          # BOM upload wizard
│   ├── procurement/
│   │   ├── index.tsx
│   │   ├── purchase-orders/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── vendors/
│   │   │   └── index.tsx
│   │   └── suppliers/
│   │       └── index.tsx
│   ├── manufacturing/
│   │   └── index.tsx
│   ├── quality/
│   │   └── index.tsx
│   ├── inventory/
│   │   ├── index.tsx
│   │   └── stock-adjustments.tsx
│   ├── assembly/
│   │   └── index.tsx
│   ├── cmm/
│   │   └── index.tsx
│   ├── accounts/
│   │   ├── index.tsx
│   │   └── invoices/
│   │       ├── index.tsx
│   │       ├── [id].tsx
│   │       └── new.tsx
│   ├── settings/
│   │   ├── index.tsx
│   │   ├── users.tsx
│   │   ├── roles.tsx
│   │   └── masters/
│   │       ├── customers.tsx
│   │       ├── vendors.tsx
│   │       └── suppliers.tsx
│   └── 404.tsx
│
├── widgets/                    # Complex UI blocks (combine features)
│   ├── layout/
│   │   ├── main-layout.tsx     # Sidebar + Header + Content
│   │   ├── sidebar/
│   │   │   ├── index.tsx
│   │   │   ├── sidebar-nav.tsx
│   │   │   └── sidebar-item.tsx
│   │   ├── header/
│   │   │   ├── index.tsx
│   │   │   ├── user-menu.tsx
│   │   │   └── notifications.tsx
│   │   └── breadcrumbs.tsx
│   ├── project-card/
│   │   └── index.tsx
│   ├── fixture-timeline/
│   │   └── index.tsx
│   ├── bom-table/
│   │   ├── index.tsx
│   │   ├── columns.tsx
│   │   ├── toolbar.tsx
│   │   └── bulk-actions.tsx
│   ├── cost-breakdown-modal/
│   │   └── index.tsx
│   ├── po-creation-wizard/
│   │   ├── index.tsx
│   │   ├── step-select-parts.tsx
│   │   ├── step-select-vendor.tsx
│   │   └── step-confirm.tsx
│   └── file-upload/
│       ├── index.tsx
│       └── zip-upload-wizard.tsx
│
├── features/                   # Business logic by domain
│   ├── auth/
│   │   ├── api/
│   │   │   ├── auth.api.ts     # API calls
│   │   │   └── auth.queries.ts # TanStack Query hooks
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   └── use-permissions.ts
│   │   ├── stores/
│   │   │   └── auth.store.ts   # Zustand store
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts            # Public API
│   │
│   ├── projects/
│   │   ├── api/
│   │   │   ├── projects.api.ts
│   │   │   └── projects.queries.ts
│   │   ├── hooks/
│   │   │   └── use-project-filters.ts
│   │   ├── components/
│   │   │   ├── project-form.tsx
│   │   │   ├── project-status-badge.tsx
│   │   │   └── timeline-indicator.tsx
│   │   ├── types/
│   │   │   └── project.types.ts
│   │   └── index.ts
│   │
│   ├── fixtures/
│   │   ├── api/
│   │   │   ├── fixtures.api.ts
│   │   │   └── fixtures.queries.ts
│   │   ├── hooks/
│   │   │   └── use-fixture-status.ts
│   │   ├── components/
│   │   │   ├── fixture-form.tsx
│   │   │   ├── fixture-status-badge.tsx
│   │   │   ├── dispatch-flags.tsx
│   │   │   └── version-history.tsx
│   │   ├── types/
│   │   │   └── fixture.types.ts
│   │   └── index.ts
│   │
│   ├── bom/
│   │   ├── api/
│   │   │   ├── parts.api.ts
│   │   │   └── parts.queries.ts
│   │   ├── hooks/
│   │   │   ├── use-bom-upload.ts
│   │   │   └── use-cost-calculation.ts
│   │   ├── components/
│   │   │   ├── part-status-badge.tsx
│   │   │   ├── cost-breakdown-form.tsx
│   │   │   └── wrong-entry-alert.tsx
│   │   ├── types/
│   │   │   └── bom.types.ts
│   │   └── index.ts
│   │
│   ├── procurement/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── components/
│   │   │   ├── po-form.tsx
│   │   │   ├── vendor-selector.tsx
│   │   │   └── column-selector.tsx
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── inventory/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── invoices/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── types/
│   │   └── index.ts
│   │
│   └── users/
│       ├── api/
│       ├── hooks/
│       ├── components/
│       ├── types/
│       └── index.ts
│
├── entities/                   # Business entities (data + minimal UI)
│   ├── project/
│   │   ├── model/
│   │   │   └── project.ts      # Type definitions
│   │   ├── ui/
│   │   │   └── project-avatar.tsx
│   │   └── index.ts
│   ├── fixture/
│   │   ├── model/
│   │   │   └── fixture.ts
│   │   ├── ui/
│   │   │   └── fixture-icon.tsx
│   │   └── index.ts
│   ├── user/
│   │   ├── model/
│   │   │   └── user.ts
│   │   ├── ui/
│   │   │   └── user-avatar.tsx
│   │   └── index.ts
│   └── ...
│
├── shared/                     # Shared utilities (no business logic)
│   ├── api/
│   │   ├── client.ts           # Axios instance with interceptors
│   │   ├── interceptors.ts     # Auth interceptor, error handling
│   │   └── types.ts            # API response types
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── command.tsx         # cmdk wrapper
│   │   ├── calendar.tsx        # Date picker
│   │   ├── sonner.tsx          # Toast provider
│   │   ├── data-table/
│   │   │   ├── index.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── column-header.tsx
│   │   │   └── toolbar.tsx
│   │   ├── form/
│   │   │   ├── form-field.tsx
│   │   │   ├── form-select.tsx
│   │   │   └── form-date-picker.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── utils.ts            # cn(), formatDate(), formatCurrency()
│   │   ├── constants.ts        # App constants
│   │   └── validations.ts      # Zod schemas (shared)
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-media-query.ts
│   │   └── use-disclosure.ts
│   ├── types/
│   │   ├── common.ts           # Common types
│   │   └── api.ts              # API types
│   └── config/
│       ├── env.ts              # Environment variables
│       ├── navigation.ts       # Nav items by role
│       └── permissions.ts      # Permission constants
│
└── index.tsx                   # Entry point
```

---

## 8. Frontend Code Patterns

### Package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.24.0",
    "@tanstack/react-table": "^8.13.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.4",
    "zod": "^3.22.4",
    "axios": "^1.6.7",
    "tailwindcss": "^3.4.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "lucide-react": "^0.344.0",
    "sonner": "^1.4.0",
    "cmdk": "^0.2.1",
    "framer-motion": "^11.0.5",
    "date-fns": "^3.3.1",
    "react-day-picker": "^8.10.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "typescript": "^5.3.3",
    "vite": "^5.1.0",
    "@vitejs/plugin-react": "^4.2.1"
  }
}
```

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### App Providers Setup

```typescript
// app/providers/index.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="metaerp-theme">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### API Client with Auth Interceptor (Axios)

```typescript
// shared/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/features/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401, refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshed = await useAuthStore.getState().refreshToken();
      if (refreshed) {
        return apiClient(error.config);
      }
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export { apiClient };
```

### Feature API Layer

```typescript
// features/fixtures/api/fixtures.api.ts
import { apiClient } from '@/shared/api/client';
import type { Fixture, FixturePart, CreateFixtureDto } from '../types/fixture.types';

export const fixturesApi = {
  list: (projectId?: string) => 
    apiClient.get<Fixture[]>('/fixtures', { params: { project_id: projectId } }),
  
  get: (id: string) => 
    apiClient.get<Fixture>(`/fixtures/${id}`),
  
  create: (data: CreateFixtureDto) => 
    apiClient.post<Fixture>('/fixtures', data),
  
  getParts: (fixtureId: string) => 
    apiClient.get<FixturePart[]>(`/fixtures/${fixtureId}/parts`),
  
  uploadBom: (fixtureId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/fixtures/${fixtureId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
```

### TanStack Query Hooks

```typescript
// features/fixtures/api/fixtures.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixturesApi } from './fixtures.api';

export const fixtureKeys = {
  all: ['fixtures'] as const,
  lists: () => [...fixtureKeys.all, 'list'] as const,
  list: (projectId?: string) => [...fixtureKeys.lists(), projectId] as const,
  details: () => [...fixtureKeys.all, 'detail'] as const,
  detail: (id: string) => [...fixtureKeys.details(), id] as const,
  parts: (id: string) => [...fixtureKeys.detail(id), 'parts'] as const,
};

export function useFixtures(projectId?: string) {
  return useQuery({
    queryKey: fixtureKeys.list(projectId),
    queryFn: () => fixturesApi.list(projectId).then(res => res.data),
  });
}

export function useFixture(id: string) {
  return useQuery({
    queryKey: fixtureKeys.detail(id),
    queryFn: () => fixturesApi.get(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useFixtureParts(fixtureId: string) {
  return useQuery({
    queryKey: fixtureKeys.parts(fixtureId),
    queryFn: () => fixturesApi.getParts(fixtureId).then(res => res.data),
    enabled: !!fixtureId,
  });
}

export function useUploadBom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fixtureId, file }: { fixtureId: string; file: File }) =>
      fixturesApi.uploadBom(fixtureId, file),
    onSuccess: (_, { fixtureId }) => {
      queryClient.invalidateQueries({ queryKey: fixtureKeys.parts(fixtureId) });
    },
  });
}
```

### Zustand Auth Store

```typescript
// features/auth/stores/auth.store.ts
import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type { User, Permissions } from '../types/auth.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  permissions: Permissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'microsoft') => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  setAuth: (user: User, token: string, permissions: Permissions) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  permissions: null,
  isAuthenticated: false,
  isLoading: true,
  
  login: async (email, password) => {
    const response = await authApi.login(email, password);
    set({
      user: response.user,
      accessToken: response.access_token,
      permissions: response.permissions,
      isAuthenticated: true,
    });
  },
  
  loginWithOAuth: (provider) => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/login/${provider}`;
  },
  
  logout: () => {
    authApi.logout();
    set({
      user: null,
      accessToken: null,
      permissions: null,
      isAuthenticated: false,
    });
  },
  
  refreshToken: async () => {
    try {
      const response = await authApi.refresh();
      set({ accessToken: response.access_token });
      return true;
    } catch {
      return false;
    }
  },
  
  setAuth: (user, token, permissions) => {
    set({
      user,
      accessToken: token,
      permissions,
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));
```

---

## 9. Production-Grade GraphQL Architecture

### Architecture Overview

**METAERP uses a modern GraphQL stack** following patterns from industry leaders (Shopify, GitHub, Airbnb, Linear):

```
┌────────────────────────────────────────────────────────────┐
│  Components Layer (UI Logic)                              │
├────────────────────────────────────────────────────────────┤
│  Hooks Layer (React Query + GraphQL)                     │
├────────────────────────────────────────────────────────────┤
│  GraphQL Layer (Queries/Mutations/Fragments)             │
├────────────────────────────────────────────────────────────┤
│  Client Layer (graphql-request + Auth)                   │
├────────────────────────────────────────────────────────────┤
│  Generated Types (GraphQL Code Generator)                │
├────────────────────────────────────────────────────────────┤
│  Backend GraphQL API (http://localhost:8000/graphql)     │
└────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Why? |
|-----------|-----------|------|
| **Client** | graphql-request | Lightweight (5KB vs Apollo's 40KB), simpler API, perfect for React Query integration |
| **Type Generation** | GraphQL Code Generator | Auto-generate TypeScript types from schema, 100% type safety, catch breaking changes at compile time |
| **State Management** | React Query 5 | Best-in-class caching, automatic retry, optimistic updates, background refresh |
| **Query Organization** | Fragment Co-location | Reusable field selections, performance optimization, used by Facebook/Meta |

### File Structure

```
src/
├── graphql/
│   ├── client.ts                    # GraphQL client with auth interceptor
│   ├── types.generated.ts           # Auto-generated from schema (DO NOT EDIT)
│   │
│   ├── fragments/                   # Reusable field selections
│   │   ├── user.fragments.ts        # UserFields, UserWithRoles, etc.
│   │   ├── role.fragments.ts        # RoleFields, RoleWithPermissions
│   │   ├── permission.fragments.ts  # EntityPermissionFields, FieldPermissionFields
│   │   └── pagination.fragments.ts  # PaginationInfo
│   │
│   ├── queries/                     # All GraphQL queries
│   │   ├── users.queries.ts         # users, currentUser
│   │   ├── roles.queries.ts         # roles
│   │   ├── permissions.queries.ts   # myPermissions, entityPermissions, fieldPermissions
│   │   └── search.queries.ts        # Unified search for cmdk
│   │
│   └── mutations/                   # All GraphQL mutations
│       ├── auth.mutations.ts        # login, refresh
│       └── users.mutations.ts       # createUser, updateUser, deleteUser (when backend ready)
│
├── hooks/
│   └── graphql/                     # React Query + GraphQL hooks
│       ├── useUsersQuery.ts         # useUsers, useUser, useInfiniteUsers (hybrid pagination)
│       ├── useAuthMutation.ts       # useLogin, useRefreshToken
│       ├── usePermissionsQuery.ts   # useMyPermissions, useEntityPermissions
│       └── useCommandSearch.ts      # useGlobalSearch for cmdk (debounced)
│
└── components/
    └── CommandPalette/              # cmdk integration
        ├── CommandPalette.tsx       # Main component (Cmd+K)
        ├── useCommandPalette.ts     # Hook for keyboard shortcuts
        └── commands/
            ├── userCommands.ts      # User search results
            ├── navigationCommands.ts # Quick navigation
            └── actionCommands.ts    # Quick actions
```

### Code Generation Setup

**codegen.yml:**
```yaml
schema: http://localhost:8000/graphql
documents: 'src/**/*.{ts,tsx}'
generates:
  src/graphql/types.generated.ts:
    plugins:
      - typescript                   # Generate TypeScript types
      - typescript-operations        # Generate types for queries/mutations
      - typed-document-node          # Type-safe document nodes
    config:
      strictScalars: true
      scalars:
        DateTime: string
      enumsAsTypes: true
      skipTypename: false
```

**NPM Scripts:**
```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.yml",
    "codegen:watch": "graphql-codegen --config codegen.yml --watch"
  }
}
```

### GraphQL Client Implementation

```typescript
// src/graphql/client.ts
import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql';

// Create client instance
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  credentials: 'include', // Send cookies (refresh token)
});

// Request middleware - add auth token
graphqlClient.requestConfig.headers = () => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Error handling wrapper
export async function executeGraphQL<T>(
  document: any,
  variables?: any
): Promise<T> {
  try {
    return await graphqlClient.request<T>(document, variables);
  } catch (error: any) {
    // Handle 401 - token expired
    if (error.response?.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED') {
      const refreshed = await useAuthStore.getState().refreshToken();
      if (refreshed) {
        // Retry request with new token
        return await graphqlClient.request<T>(document, variables);
      }
      // Refresh failed, logout
      useAuthStore.getState().logout();
      throw new Error('Session expired. Please log in again.');
    }
    
    // Handle other errors
    const message = error.response?.errors?.[0]?.message || 'GraphQL request failed';
    toast.error(message);
    throw error;
  }
}
```

### Fragment Pattern (Co-location)

```typescript
// src/graphql/fragments/user.fragments.ts
import { graphql } from './types.generated';

// Basic user fields
export const UserFieldsFragment = graphql(`
  fragment UserFields on UserType {
    id
    email
    isActive
    roles
  }
`);

// User with detailed info
export const UserDetailFragment = graphql(`
  fragment UserDetail on UserType {
    ...UserFields
    createdAt
    lastLogin
  }
`);

// Pagination info (reusable across all paginated queries)
export const PaginationInfoFragment = graphql(`
  fragment PaginationInfo on PaginatedUsersType {
    total
    skip
    limit
    page
    totalPages
    hasMore
  }
`);
```

### Query Definitions

```typescript
// src/graphql/queries/users.queries.ts
import { graphql } from '../types.generated';

// Get paginated users
export const GET_USERS = graphql(`
  query GetUsers($skip: Int!, $limit: Int!) {
    users(skip: $skip, limit: $limit) {
      items {
        ...UserFields
      }
      ...PaginationInfo
    }
  }
`);

// Get single user
export const GET_USER = graphql(`
  query GetUser($id: String!) {
    user(id: $id) {
      ...UserDetail
    }
  }
`);

// Get current authenticated user
export const GET_CURRENT_USER = graphql(`
  query GetCurrentUser {
    currentUser {
      ...UserDetail
    }
  }
`);

// Search users (for cmdk)
export const SEARCH_USERS = graphql(`
  query SearchUsers($query: String!, $limit: Int!) {
    users(skip: 0, limit: $limit) {
      items {
        id
        email
        roles
      }
    }
  }
`);
```

### Mutation Definitions

```typescript
// src/graphql/mutations/auth.mutations.ts
import { graphql } from '../types.generated';

export const LOGIN_MUTATION = graphql(`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      tokenType
      user {
        ...UserFields
      }
    }
  }
`);

export const REFRESH_TOKEN_MUTATION = graphql(`
  mutation RefreshToken($refreshToken: String!) {
    refresh(refreshToken: $refreshToken) {
      accessToken
      tokenType
    }
  }
`);
```

### React Query Hooks (with Type Safety)

```typescript
// src/hooks/graphql/useUsersQuery.ts
import { useQuery, useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query';
import { executeGraphQL } from '@/graphql/client';
import { GET_USERS, GET_USER } from '@/graphql/queries/users.queries';
import type { GetUsersQuery, GetUsersQueryVariables } from '@/graphql/types.generated';

// Query keys factory
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: GetUsersQueryVariables) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Standard paginated query
export function useUsers(skip: number = 0, limit: number = 50) {
  return useQuery({
    queryKey: userKeys.list({ skip, limit }),
    queryFn: () => executeGraphQL<GetUsersQuery>(GET_USERS, { skip, limit }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Infinite query for hybrid pagination
export function useInfiniteUsers(pageSize: number = 1000) {
  return useInfiniteQuery({
    queryKey: userKeys.lists(),
    queryFn: ({ pageParam = 0 }) =>
      executeGraphQL<GetUsersQuery>(GET_USERS, {
        skip: pageParam,
        limit: pageSize,
      }),
    getNextPageParam: (lastPage) => {
      const { hasMore, skip, limit } = lastPage.users;
      return hasMore ? skip + limit : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });
}

// Single user query
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => executeGraphQL(GET_USER, { id }),
    enabled: !!id,
  });
}
```

### Hybrid Pagination Strategy

**Architecture:**
1. Backend sends up to 1000 rows per request
2. Frontend caches data with React Query
3. TanStack Table handles client-side pagination
4. Auto-fetch next batch when user reaches end
5. Page size configurable via .env

**Environment Configuration (.env.local):**
```env
# GraphQL Configuration
VITE_GRAPHQL_ENDPOINT=http://localhost:8000/graphql

# Hybrid Pagination Settings
VITE_TABLE_PAGE_SIZE=50          # Client-side page size
VITE_GRAPHQL_BATCH_SIZE=1000     # Rows per GraphQL request

# Cache Settings
VITE_CACHE_STALE_TIME=300000     # 5 minutes
VITE_CACHE_GC_TIME=600000        # 10 minutes
```

**Implementation Example:**
```typescript
// pages/users/UsersList.tsx
import { useInfiniteUsers } from '@/hooks/graphql/useUsersQuery';
import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';

export function UsersList() {
  const batchSize = Number(import.meta.env.VITE_GRAPHQL_BATCH_SIZE) || 1000;
  const pageSize = Number(import.meta.env.VITE_TABLE_PAGE_SIZE) || 50;
  
  // Fetch data with infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUsers(batchSize);
  
  // Flatten all pages into single array
  const allUsers = useMemo(() => {
    return data?.pages.flatMap(page => page.users.items) ?? [];
  }, [data]);
  
  // TanStack Table setup
  const table = useReactTable({
    data: allUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });
  
  // Auto-fetch next batch when near end
  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();
  
  if (currentPage >= totalPages - 2 && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
  
  return (
    <div>
      {/* Table UI */}
      <DataTable table={table} />
      
      {/* Pagination controls */}
      <PaginationControls table={table} />
      
      {/* Loading indicator for next batch */}
      {isFetchingNextPage && <Loader />}
    </div>
  );
}
```

### Command Palette (cmdk) Integration

**Features:**
- Real-time GraphQL search across all entities
- Debounced queries (300ms)
- Keyboard shortcuts (Cmd+K / Ctrl+K)
- Recent items cache
- Navigation + actions in one interface

**Implementation:**
```typescript
// components/CommandPalette/CommandPalette.tsx
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useGlobalSearch } from '@/hooks/graphql/useCommandSearch';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useNavigate } from 'react-router-dom';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const navigate = useNavigate();
  
  // Global search with GraphQL
  const { data, isLoading } = useGlobalSearch(debouncedSearch, {
    enabled: debouncedSearch.length > 2,
  });
  
  // Keyboard shortcut (Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input
        placeholder="Search users, projects, fixtures..."
        value={search}
        onValueChange={setSearch}
      />
      
      <Command.List>
        {isLoading && <Command.Loading>Searching...</Command.Loading>}
        
        {/* Users */}
        <Command.Group heading="Users">
          {data?.users.map(user => (
            <Command.Item
              key={user.id}
              onSelect={() => {
                navigate(`/users/${user.id}`);
                setOpen(false);
              }}
            >
              {user.email}
            </Command.Item>
          ))}
        </Command.Group>
        
        {/* Quick Navigation */}
        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => navigate('/dashboard')}>
            Dashboard
          </Command.Item>
          <Command.Item onSelect={() => navigate('/projects')}>
            Projects
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

```typescript
// hooks/graphql/useCommandSearch.ts
import { useQuery } from '@tanstack/react-query';
import { executeGraphQL } from '@/graphql/client';
import { SEARCH_USERS } from '@/graphql/queries/search.queries';

export function useGlobalSearch(query: string, options?: any) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => executeGraphQL(SEARCH_USERS, { query, limit: 10 }),
    ...options,
  });
}
```

### Best Practices

#### 1. Fragment Reusability
```typescript
// ✅ GOOD - Reuse fragments
const USER_FRAGMENT = graphql(`fragment UserFields ...`);
const GET_USERS = graphql(`query GetUsers { users { ...UserFields } }`);
const GET_USER = graphql(`query GetUser { user { ...UserFields } }`);

// ❌ BAD - Duplicate field selections
const GET_USERS = graphql(`query { users { id email roles } }`);
const GET_USER = graphql(`query { user { id email roles } }`);
```

#### 2. Query Key Factories
```typescript
// ✅ GOOD - Centralized query keys
export const userKeys = {
  all: ['users'],
  lists: () => [...userKeys.all, 'list'],
  list: (params) => [...userKeys.lists(), params],
  detail: (id) => [...userKeys.all, 'detail', id],
};

// Usage
queryClient.invalidateQueries({ queryKey: userKeys.all }); // Invalidate all user queries
queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }); // Invalidate specific user
```

#### 3. Error Handling
```typescript
// ✅ GOOD - Centralized error handling in client
export async function executeGraphQL<T>(document, variables) {
  try {
    return await graphqlClient.request<T>(document, variables);
  } catch (error) {
    if (isAuthError(error)) {
      await refreshToken();
      return retry();
    }
    toast.error(extractErrorMessage(error));
    throw error;
  }
}
```

#### 4. Type Safety
```typescript
// ✅ GOOD - Use generated types
import type { GetUsersQuery, GetUsersQueryVariables } from '@/graphql/types.generated';

function useUsers(variables: GetUsersQueryVariables) {
  return useQuery<GetUsersQuery>({
    queryFn: () => executeGraphQL<GetUsersQuery>(GET_USERS, variables),
  });
}

// ❌ BAD - Manual types
function useUsers(skip: number, limit: number) {
  return useQuery<{ users: any[] }>({ ... });
}
```

#### 5. Optimistic Updates
```typescript
// ✅ GOOD - Optimistic UI updates
const updateUser = useMutation({
  mutationFn: (data) => executeGraphQL(UPDATE_USER, data),
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: userKeys.detail(newData.id) });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(userKeys.detail(newData.id));
    
    // Optimistically update cache
    queryClient.setQueryData(userKeys.detail(newData.id), newData);
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // Roll back on error
    queryClient.setQueryData(userKeys.detail(variables.id), context?.previous);
  },
  onSettled: (data, error, variables) => {
    // Refetch to ensure sync
    queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
  },
});
```

### Performance Optimizations

1. **Request Batching** (optional future enhancement)
   - Batch multiple queries into single HTTP request
   - Reduce network overhead

2. **Persisted Queries** (optional future enhancement)
   - Send query hash instead of full query string
   - Reduce bandwidth by ~70%

3. **Cache Strategies**
   - Stale-while-revalidate pattern (React Query default)
   - Background refetch on window focus
   - Automatic retry with exponential backoff

4. **Code Splitting**
   - Lazy load GraphQL queries per route
   - Smaller initial bundle size

### Migration Path from REST to GraphQL

**Phase 1: Current (Completed)**
- ✅ GraphQL backend ready
- ✅ Auth with JWT + refresh tokens
- ✅ Permission system working

**Phase 2: GraphQL Integration (In Progress)**
- ✅ Install graphql-request + codegen
- ✅ Set up type generation
- 🔄 Create GraphQL client
- 🔄 Build query/mutation layers
- 🔄 Create React Query hooks
- 🔄 Migrate UsersList to GraphQL
- 🔄 Implement cmdk command palette

**Phase 3: Expand GraphQL Coverage (Future)**
- Projects queries/mutations
- Fixtures queries/mutations
- BOM queries/mutations
- Procurement queries/mutations
- All other entities

**Phase 4: Optimization (Future)**
- Request batching
- Persisted queries
- Cache warming
- Prefetching strategies

---

## 10. Best Practices Summary

### Authentication
- Store access tokens in memory (Zustand)
- Refresh tokens in httpOnly cookies
- Auto-refresh on 401 errors
- Clear all state on logout

### GraphQL
- Use fragments for field reusability
- Centralized query key factories
- Type generation from schema (never manual types)
- Error handling at client level
- Optimistic updates for better UX

### State Management
- Server state: React Query (API data)
- Client state: Zustand (auth, UI state)
- Form state: React Hook Form (form data)
- Never duplicate server state in Zustand

### Code Organization
- Feature-Sliced Design architecture
- Co-locate related code
- No cross-imports between features
- Shared code in `shared/` layer only

### Performance
- Lazy load routes with React.lazy()
- Debounce search inputs (300ms)
- Virtual scrolling for large lists (TanStack Virtual)
- Image optimization with lazy loading
- Code splitting by route

### Type Safety
- No `any` types (use `unknown` if needed)
- Generate types from GraphQL schema
- Validate forms with Zod schemas
- Type all API responses

---

## 11. Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_GRAPHQL_ENDPOINT=http://localhost:8000/graphql

# OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id

# Pagination
VITE_TABLE_PAGE_SIZE=50
VITE_GRAPHQL_BATCH_SIZE=1000

# Cache Configuration
VITE_CACHE_STALE_TIME=300000     # 5 minutes
VITE_CACHE_GC_TIME=600000        # 10 minutes

# Feature Flags
VITE_ENABLE_OAUTH=true
VITE_ENABLE_DARK_MODE=true
```

---

## 12. Quick Reference

### Common Commands
```bash
# Development
npm run dev                 # Start dev server
npm run codegen            # Generate GraphQL types
npm run codegen:watch      # Watch mode for type generation
npm run type-check         # TypeScript check
npm run lint               # ESLint check

# Build
npm run build              # Production build
npm run preview            # Preview production build
```

### Key Files
- `codegen.yml` - GraphQL code generation config
- `src/graphql/types.generated.ts` - Auto-generated types (DO NOT EDIT)
- `src/graphql/client.ts` - GraphQL client setup
- `src/stores/authStore.ts` - Auth state management
- `.env.local` - Environment variables (git-ignored)

---

**Last Updated**: February 2026
**Version**: 2.0.0 (GraphQL Architecture Added)
    });
  },
}));
```

### Permission Hook

```typescript
// features/auth/hooks/use-permissions.ts
import { useAuthStore } from '../stores/auth.store';

export function usePermissions() {
  const { user, permissions } = useAuthStore();
  
  const canAccessEntity = (entity: string, action: string): boolean => {
    return permissions?.entities?.[entity]?.[`can_${action}`] ?? false;
  };
  
  const canViewField = (entity: string, field: string): boolean => {
    return permissions?.fields?.[entity]?.[field]?.can_read ?? true;
  };
  
  const canEditField = (entity: string, field: string): boolean => {
    return permissions?.fields?.[entity]?.[field]?.can_write ?? false;
  };
  
  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };
  
  return {
    canAccessEntity,
    canViewField,
    canEditField,
    hasRole,
    isOwner: hasRole('OPERATIONS_HEAD'),
    isAccounts: hasRole('ACCOUNTS_TEAM'),
  };
}
```

### Permission-Aware Table Columns

```typescript
// widgets/bom-table/columns.tsx
import { usePermissions } from '@/features/auth';
import type { ColumnDef } from '@tanstack/react-table';
import type { FixturePart } from '@/features/fixtures';
import { formatCurrency } from '@/shared/lib/utils';
import { PartStatusBadge } from '@/features/bom';

export function usePartColumns(): ColumnDef<FixturePart>[] {
  const { canViewField } = usePermissions();
  
  const columns: ColumnDef<FixturePart>[] = [
    {
      accessorKey: 'drawing_number',
      header: 'Drawing No.',
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'qty_lh',
      header: 'QTY LH',
    },
    {
      accessorKey: 'qty_rh',
      header: 'QTY RH',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <PartStatusBadge status={row.original.status} />,
    },
  ];
  
  // Conditionally add cost columns based on permissions
  if (canViewField('fixture_parts', 'cost_per_piece')) {
    columns.push({
      accessorKey: 'cost_per_piece',
      header: 'Cost/Piece',
      cell: ({ row }) => formatCurrency(row.original.cost_per_piece),
    });
  }
  
  if (canViewField('fixture_parts', 'total_cost')) {
    columns.push({
      accessorKey: 'total_cost',
      header: 'Total Cost',
      cell: ({ row }) => formatCurrency(row.original.total_cost),
    });
  }
  
  return columns;
}
```

### Feature Public API (Index Export)

```typescript
// features/fixtures/index.ts
// Only export what other layers need - encapsulation!

export { 
  useFixtures, 
  useFixture, 
  useFixtureParts,
  useUploadBom,
  fixtureKeys 
} from './api/fixtures.queries';

export { FixtureForm } from './components/fixture-form';
export { FixtureStatusBadge } from './components/fixture-status-badge';
export { DispatchFlags } from './components/dispatch-flags';
export { VersionHistory } from './components/version-history';

export type { 
  Fixture, 
  FixturePart, 
  FixtureStatus,
  CreateFixtureDto 
} from './types/fixture.types';
```

### React Hook Form + Zod Pattern

```typescript
// features/projects/components/project-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Calendar } from '@/shared/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { useCreateProject } from '../api/projects.queries';

// Zod schema for validation
const projectSchema = z.object({
  project_number: z
    .string()
    .length(5, 'Project number must be exactly 5 characters')
    .regex(/^[A-Z][0-9]{5}$/, 'Format: Letter + 5 digits (e.g., S25049)'),
  customer_id: z.string().uuid('Please select a customer'),
  target_date: z.date({ required_error: 'Target date is required' }),
  budget: z.number().positive('Budget must be positive').optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export function ProjectForm({ onSuccess }: { onSuccess?: () => void }) {
  const createProject = useCreateProject();
  
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_number: '',
      customer_id: '',
      budget: undefined,
    },
  });
  
  const onSubmit = async (data: ProjectFormData) => {
    try {
      await createProject.mutateAsync(data);
      toast.success('Project created successfully');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="project_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Number</FormLabel>
              <FormControl>
                <Input placeholder="S25049" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="target_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Date</FormLabel>
              <FormControl>
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={createProject.isPending}>
          {createProject.isPending ? 'Creating...' : 'Create Project'}
        </Button>
      </form>
    </Form>
  );
}
```

### Command Palette (cmdk)

```typescript
// widgets/command-palette/index.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { 
  FolderKanban, 
  Package, 
  FileBox, 
  Users, 
  Settings,
  Search 
} from 'lucide-react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { useProjects } from '@/features/projects';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  
  // Toggle with ⌘+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              placeholder="Type a command or search..." 
              className="flex h-11 w-full bg-transparent py-3 outline-none"
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty>No results found.</Command.Empty>
            
            <Command.Group heading="Navigation">
              <Command.Item onSelect={() => runCommand(() => navigate('/projects'))}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Projects
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => navigate('/fixtures'))}>
                <Package className="mr-2 h-4 w-4" />
                Fixtures
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => navigate('/procurement'))}>
                <FileBox className="mr-2 h-4 w-4" />
                Procurement
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="Recent Projects">
              {projects?.slice(0, 5).map((project) => (
                <Command.Item 
                  key={project.id}
                  onSelect={() => runCommand(() => navigate(`/projects/${project.id}`))}
                >
                  <FolderKanban className="mr-2 h-4 w-4" />
                  {project.project_number} - {project.customer_name}
                </Command.Item>
              ))}
            </Command.Group>
            
            <Command.Group heading="Settings">
              <Command.Item onSelect={() => runCommand(() => navigate('/settings/users'))}>
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => navigate('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

### Toast Notifications (Sonner)

```typescript
// Usage examples throughout the app
import { toast } from 'sonner';

// Success
toast.success('Project created successfully');

// Error
toast.error('Failed to upload BOM', {
  description: 'Please check the file format and try again',
});

// Loading with promise
toast.promise(uploadBom(file), {
  loading: 'Uploading BOM...',
  success: 'BOM uploaded successfully',
  error: 'Failed to upload BOM',
});

// Custom with action
toast('Fixture status updated', {
  description: 'S25049-001 is now in Assembly',
  action: {
    label: 'View',
    onClick: () => navigate(`/fixtures/${fixtureId}`),
  },
});

// Dismiss all
toast.dismiss();
```

### Framer Motion Animations

```typescript
// shared/ui/animated-container.tsx
import { motion, AnimatePresence } from 'framer-motion';

// Page transition wrapper
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// List item animation
export function AnimatedListItem({ 
  children, 
  index 
}: { 
  children: React.ReactNode; 
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  );
}

// Expandable section
export function Collapsible({ 
  isOpen, 
  children 
}: { 
  isOpen: boolean; 
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

```typescript
// Usage in project card with hover animation
import { motion } from 'framer-motion';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="p-4 border rounded-lg cursor-pointer"
    >
      <h3>{project.project_number}</h3>
      <p>{project.customer_name}</p>
    </motion.div>
  );
}
```

### Data Table with TanStack Table

```typescript
// shared/ui/data-table/index.tsx
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { DataTablePagination } from './pagination';
import { DataTableToolbar } from './toolbar';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, rowSelection },
  });
  
  return (
    <div className="space-y-4">
      {searchKey && (
        <DataTableToolbar 
          table={table} 
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
        />
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())
                    }
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <DataTablePagination table={table} />
    </div>
  );
}
```

### Page Component (Thin - Composes Widgets)

```typescript
// pages/fixtures/[id]/parts.tsx
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/widgets/layout';
import { BomTable } from '@/widgets/bom-table';
import { useFixture, useFixtureParts } from '@/features/fixtures';
import { Skeleton } from '@/shared/ui/skeleton';

export default function FixturePartsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fixture, isLoading: fixtureLoading } = useFixture(id!);
  const { data: parts, isLoading: partsLoading } = useFixtureParts(id!);
  
  if (fixtureLoading || partsLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {fixture?.fixture_number}
          </h1>
          <p className="text-muted-foreground">Bill of Materials</p>
        </div>
        
        <BomTable fixtureId={id!} parts={parts ?? []} />
      </div>
    </MainLayout>
  );
}
```

---

## 9. Backend Architecture (FastAPI)

### Folder Structure

```
app/
├── api/
│   ├── v1/
│   │   ├── auth.py
│   │   ├── projects.py
│   │   ├── fixtures.py
│   │   ├── parts.py
│   │   └── ...
│   └── deps.py              # Dependencies
├── auth/
│   ├── jwt.py               # JWT utilities
│   ├── oauth.py             # OAuth providers
│   └── dependencies.py      # Auth dependencies
├── authorization/
│   ├── permission_service.py
│   └── decorators.py
├── models/                  # SQLAlchemy models
├── schemas/                 # Pydantic schemas
├── services/                # Business logic
├── core/
│   ├── config.py
│   └── security.py
└── main.py
```

### Permission Service

```python
# app/authorization/permission_service.py
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Set, Dict, List, Any

class PermissionService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_roles(self, user_id: str) -> List[str]:
        query = text("SELECT role_id FROM user_roles WHERE user_id = :user_id")
        result = self.db.execute(query, {"user_id": user_id})
        return [str(row[0]) for row in result]
    
    def can_perform_action(self, role_ids: List[str], entity: str, action: str) -> bool:
        query = text("""
            SELECT bool_or(can_create), bool_or(can_read), 
                   bool_or(can_update), bool_or(can_delete), bool_or(can_list)
            FROM role_entity_permissions rep
            JOIN entities e ON rep.entity_id = e.id
            WHERE rep.role_id = ANY(:role_ids) AND e.name = :entity
        """)
        result = self.db.execute(query, {"role_ids": role_ids, "entity": entity}).fetchone()
        
        if not result:
            return False
        
        action_map = {'create': 0, 'read': 1, 'update': 2, 'delete': 3, 'list': 4}
        return result[action_map.get(action, 1)] or False
    
    def get_hidden_fields(self, role_ids: List[str], entity: str) -> Set[str]:
        query = text("""
            SELECT ef.field_name
            FROM entity_fields ef
            JOIN entities e ON ef.entity_id = e.id
            LEFT JOIN role_field_permissions rfp ON rfp.field_id = ef.id 
                AND rfp.role_id = ANY(:role_ids)
            WHERE e.name = :entity
            GROUP BY ef.field_name
            HAVING bool_or(COALESCE(rfp.can_read, false)) = false
        """)
        result = self.db.execute(query, {"role_ids": role_ids, "entity": entity})
        return {row[0] for row in result}
    
    def filter_response(self, data: Dict, role_ids: List[str], entity: str) -> Dict:
        hidden = self.get_hidden_fields(role_ids, entity)
        return {k: v for k, v in data.items() if k not in hidden}
    
    def filter_response_list(self, data_list: List[Dict], role_ids: List[str], entity: str) -> List[Dict]:
        hidden = self.get_hidden_fields(role_ids, entity)
        return [{k: v for k, v in item.items() if k not in hidden} for item in data_list]
```

### API Endpoint with Permissions

```python
# app/api/v1/fixtures.py
from fastapi import APIRouter, Depends
from app.auth.dependencies import require_entity_permission, get_current_user_with_roles
from app.authorization.permission_service import PermissionService

router = APIRouter(prefix="/fixtures", tags=["Fixtures"])

@router.get("/{fixture_id}/parts")
async def get_fixture_parts(
    fixture_id: str,
    current: dict = Depends(require_entity_permission("fixture_parts", "list")),
    db: Session = Depends(get_db)
):
    parts = db.query(FixturePart).filter(FixturePart.fixture_id == fixture_id).all()
    
    perm_service = PermissionService(db)
    return perm_service.filter_response_list(
        [p.to_dict() for p in parts],
        current["role_ids"],
        "fixture_parts"
    )
```

---

## 10. Key Business Rules

### Project Management
- Project codes auto-generated: `PRJ-YYYYMMDD-XXX`
- Timeline color coding: Green (<30 days), Orange (30-60), Red (>60)
- Only Owner can edit `actual_delivery_date`

### Fixture Management
- Naming: Project (5 chars) > Fixture (-XXX) > Unit (-XX) > Drawing (-XX)
- Example: S25049-001-02-01
- Version increments by 1.0 for Revisions (R1, R2) and ECNs (ECN1, ECN2)
- Rework does NOT change version

### BOM Management
- Wrong entries flagged, block fixture submission until resolved
- Standard parts linked at project level
- Cost breakdown stored as JSONB with multiple labels

### Procurement
- 8 PO types: 4 part-level, 4 fixture-level
- Vendor selection at bulk level (not row level)
- Quantity fields NOT editable by Procurement
- Fields locked after PO creation

### Issue Resolution
- **Revision**: Design problem → Copy part with R1/R2 suffix → Manufacturing cycle
- **ECN**: Missing part → New BOM entry with ECN1/ECN2 suffix
- **Rework**: Manufacturing fault → Same part back to manufacturing

---

## 11. Coding Guidelines

### TypeScript (React)
- Strict TypeScript - no `any` types
- Functional components only
- Custom hooks for reusable logic
- **State Management:**
  - Zustand for global client state (auth, UI preferences)
  - TanStack Query for server state (API data, caching)
- **Forms:**
  - React Hook Form for form handling
  - Zod for schema validation
  - `@hookform/resolvers` to connect them
- **Tables:**
  - TanStack Table for all data tables
  - Permission-aware column definitions
- **UI:**
  - shadcn/ui as component base
  - Tailwind CSS for styling
  - Lucide React for icons
  - Sonner for toast notifications
  - cmdk for command palette
  - Framer Motion for animations (subtle, purposeful)
- Follow Feature-Sliced Design import rules
- Use path aliases (`@/`) for imports

### File Naming Conventions
```
components:     kebab-case.tsx     (project-form.tsx)
hooks:          use-kebab-case.ts  (use-permissions.ts)
types:          kebab-case.types.ts (project.types.ts)
stores:         kebab-case.store.ts (auth.store.ts)
api:            kebab-case.api.ts   (projects.api.ts)
queries:        kebab-case.queries.ts (projects.queries.ts)
```

### Component Structure
```typescript
// Standard component structure
import { useState } from 'react';              // 1. React imports
import { motion } from 'framer-motion';        // 2. External libraries
import { Button } from '@/shared/ui/button';   // 3. Shared imports
import { useProjects } from '@/features/projects'; // 4. Feature imports
import type { Project } from '../types';       // 5. Local imports

interface Props { /* ... */ }                  // 6. Types/interfaces

export function ComponentName({ prop }: Props) {
  // hooks first
  const [state, setState] = useState();
  const { data } = useProjects();
  
  // handlers
  const handleClick = () => { /* ... */ };
  
  // render
  return ( /* ... */ );
}
```

### Python (FastAPI)
- Type hints everywhere
- Pydantic for all request/response schemas
- SQLAlchemy for ORM
- Async where beneficial (I/O operations)
- Dependency injection for DB sessions, auth

### General
- Follow existing patterns in codebase
- Write self-documenting code
- Keep functions small and focused
- Handle errors gracefully
- No business logic in shared/ layer
- Features export only public API via index.ts

---

## 12. Reference Documents

- `docs/METAERP_BRD_v1.1.docx` - Business Requirements
- `docs/METAERP_SRS_v1.1.docx` - Software Requirements
- `docs/METAERP_SDD_v1.1.docx` - Software Design
- `docs/METAERP_RTM_v1.1.docx` - Requirements Traceability Matrix
- `docs/METAERP_TestPlan_v1.1.docx` - Test Plan

---

*Last Updated: February 2026*
