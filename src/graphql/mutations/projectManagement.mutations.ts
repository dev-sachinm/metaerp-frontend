import { PROJECT_ASSIGNMENT_FIELDS } from '@/graphql/fragments/projectAssignment.fragments'

const PROJECT_FIELDS = `
  id projectNumber name customerId customerName description status
  startDate targetDate actualDeliveryDate remainingDays budget purchaseBudget
  designerTargetDate procurementTargetDate manufacturingTargetDate qualityTargetDate assemblyTargetDate
  isActive createdAt modifiedAt createdBy createdByUsername modifiedBy modifiedByUsername
`

export const CREATE_PROJECT = `
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) { ${PROJECT_FIELDS} }
  }
`

export const UPDATE_PROJECT = `
  mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) {
    updateProject(id: $id, input: $input) { ${PROJECT_FIELDS} }
  }
`

export const ASSIGN_PROJECT_PRINCIPAL = `
  mutation AssignProjectPrincipal($input: ProjectAssignmentInput!) {
    assignProjectPrincipal(input: $input) {
      ${PROJECT_ASSIGNMENT_FIELDS}
    }
  }
`

export const REMOVE_PROJECT_PRINCIPAL = `
  mutation RemoveProjectPrincipal($projectId: String!, $principalType: String!, $principalId: String!) {
    removeProjectPrincipal(projectId: $projectId, principalType: $principalType, principalId: $principalId)
  }
`

export const DELETE_PROJECT = `
  mutation DeleteProject($id: String!, $softDelete: Boolean) {
    deleteProject(id: $id, softDelete: $softDelete)
  }
`
