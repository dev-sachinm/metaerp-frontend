export type ProjectStatus =
  | 'open'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export type PrincipalType = 'user' | 'role'
export type AccessLevel = 'viewer' | 'editor' | 'owner'

export interface ProjectSummary {
  id: string
  projectNumber?: string | null
  name: string
  status?: string | null
  customerId?: string | null
  customerName?: string | null
  startDate?: string | null
  inProgressAt?: string | null
  targetDate?: string | null
  remainingDays?: number | null
  isActive?: boolean
}

export interface Project {
  id: string
  projectNumber?: string | null
  name: string
  customerId?: string | null
  customerName?: string | null
  description?: string | null
  status?: string | null
  startDate?: string | null
  inProgressAt?: string | null
  targetDate?: string | null
  actualDeliveryDate?: string | null
  remainingDays?: number | null
  budget?: number | null
  purchaseBudget?: number | null
  designerTargetDate?: string | null
  procurementTargetDate?: string | null
  manufacturingTargetDate?: string | null
  qualityTargetDate?: string | null
  assemblyTargetDate?: string | null
  isActive?: boolean
  createdAt?: string | null
  modifiedAt?: string | null
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
}

export interface ProjectAssignment {
  id: string
  projectId: string
  principalType: PrincipalType
  principalId: string
  accessLevel?: AccessLevel | null
  assignedAt?: string | null
  assignedBy?: string | null
  assignedByUsername?: string | null
}

export interface AssignableUser {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  email?: string | null
}

export interface AssignableRole {
  id: string
  name: string
  description?: string | null
}

export interface ProjectAssignmentBoard {
  project: ProjectSummary
  assignments: ProjectAssignment[]
  assignableUsers: AssignableUser[]
  assignableRoles: AssignableRole[]
  canAssign?: boolean
}

export interface PaginatedList<T> {
  items: T[]
  total: number
  skip: number
  limit: number
  page: number
  totalPages: number
  hasMore: boolean
}
