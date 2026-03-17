import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { toast } from 'sonner'
import {
  PROJECT_ASSIGNMENT_BOARD,
  PROJECTS,
  GET_PROJECT,
} from '@/graphql/queries/projectManagement.queries'
import {
  ASSIGN_PROJECT_PRINCIPAL,
  CREATE_PROJECT,
  DELETE_PROJECT,
  REMOVE_PROJECT_PRINCIPAL,
  UPDATE_PROJECT,
} from '@/graphql/mutations/projectManagement.mutations'
import type {
  AccessLevel,
  PaginatedList,
  PrincipalType,
  Project,
  ProjectAssignment,
  ProjectAssignmentBoard,
  ProjectSummary,
} from '@/types/projectManagement'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'

export interface ProjectInput {
  name?: string | null
  projectNumber?: string | null
  description?: string | null
  status?: string | null
  customerId?: string | null
  startDate?: string | null
  targetDate?: string | null
  actualDeliveryDate?: string | null
  budget?: number | null
  purchaseBudget?: number | null
  designerTargetDate?: string | null
  procurementTargetDate?: string | null
  manufacturingTargetDate?: string | null
  qualityTargetDate?: string | null
  assemblyTargetDate?: string | null
  isActive?: boolean
}

// Update uses a different GraphQL input type name: ProjectUpdateInput
// Shape is intentionally identical to ProjectInput (backend contract).
export type ProjectUpdateInput = ProjectInput

export interface ProjectAssignmentInput {
  projectId: string
  principalType: PrincipalType
  principalId: string
  accessLevel?: AccessLevel | null
}

export const projectManagementKeys = {
  all: ['projectManagement'] as const,
  projects: (skip: number, limit: number, status?: string, customerId?: string, isActive?: boolean) =>
    [...projectManagementKeys.all, 'projects', skip, limit, status ?? 'all', customerId ?? 'all', isActive ?? 'all'] as const,
  project: (id: string) => [...projectManagementKeys.all, 'project', id] as const,
  assignmentBoard: (projectId: string) => [...projectManagementKeys.all, 'assignmentBoard', projectId] as const,
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: projectManagementKeys.project(id ?? ''),
    queryFn: () =>
      executeGraphQL<{ project: Project | null }>(GET_PROJECT, { id: id! }),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      executeGraphQL<{ createProject: Project }>(CREATE_PROJECT, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectManagementKeys.all })
      toast.success('Project created')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create project'))
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectUpdateInput }) =>
      executeGraphQL<{ updateProject: Project }>(UPDATE_PROJECT, { id, input }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectManagementKeys.project(id) })
      queryClient.invalidateQueries({ queryKey: projectManagementKeys.all })
      toast.success('Project updated')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update project'))
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, softDelete = true }: { id: string; softDelete?: boolean }) =>
      executeGraphQL<{ deleteProject: boolean }>(DELETE_PROJECT, { id, softDelete }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectManagementKeys.all })
      toast.success('Project deleted')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete project'))
    },
  })
}

export function useProjects(
  skip = 0,
  limit = 20,
  status?: string,
  customerId?: string,
  isActive?: boolean
) {
  return useQuery({
    queryKey: projectManagementKeys.projects(skip, limit, status, customerId, isActive),
    queryFn: () =>
      executeGraphQL<{ projects: PaginatedList<ProjectSummary> }>(PROJECTS, {
        skip,
        limit,
        status,
        customerId,
        isActive,
      }),
    staleTime: 30 * 1000,
  })
}

export function useProjectAssignmentBoard(projectId: string | null) {
  return useQuery({
    queryKey: projectManagementKeys.assignmentBoard(projectId ?? ''),
    queryFn: () =>
      executeGraphQL<{ projectAssignmentBoard: ProjectAssignmentBoard | null }>(PROJECT_ASSIGNMENT_BOARD, {
        projectId: projectId!,
      }),
    enabled: !!projectId,
    staleTime: 10 * 1000,
  })
}

export function useAssignProjectPrincipal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectAssignmentInput) =>
      executeGraphQL<{ assignProjectPrincipal: ProjectAssignment }>(ASSIGN_PROJECT_PRINCIPAL, { input }),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: projectManagementKeys.assignmentBoard(input.projectId) })
      toast.success('Assignment added')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to assign principal'))
    },
  })
}

export function useRemoveProjectPrincipal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { projectId: string; principalType: PrincipalType; principalId: string }) =>
      executeGraphQL<{ removeProjectPrincipal: boolean }>(REMOVE_PROJECT_PRINCIPAL, input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: projectManagementKeys.assignmentBoard(input.projectId) })
      toast.success('Assignment removed')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to remove assignment'))
    },
  })
}
