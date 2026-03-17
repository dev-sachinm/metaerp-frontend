import {
  PROJECT_SUMMARY_FIELDS,
  PROJECT_ASSIGNMENT_FIELDS,
  ASSIGNABLE_ROLE_FIELDS,
  ASSIGNABLE_USER_FIELDS,
} from '@/graphql/fragments/projectAssignment.fragments'

const LIST_FIELDS = 'id total skip limit page totalPages hasMore'

export const GET_PROJECT = `
  query GetProject($id: String!) {
    project(id: $id) {
      id
      projectNumber
      name
      customerId
      customerName
      description
      status
      startDate
      targetDate
      actualDeliveryDate
      remainingDays
      budget
      purchaseBudget
      designerTargetDate
      procurementTargetDate
      manufacturingTargetDate
      qualityTargetDate
      assemblyTargetDate
      isActive
      createdAt
      modifiedAt
      createdBy
      createdByUsername
      modifiedBy
      modifiedByUsername
    }
  }
`

export const PROJECTS = `
  query Projects($skip: Int!, $limit: Int!, $status: String, $customerId: String, $isActive: Boolean) {
    projects(skip: $skip, limit: $limit, status: $status, customerId: $customerId, isActive: $isActive) {
      items {
        ${PROJECT_SUMMARY_FIELDS}
      }
      ${LIST_FIELDS}
    }
  }
`

export const PROJECT_ASSIGNMENT_BOARD = `
  query ProjectAssignmentBoard($projectId: String!) {
    projectAssignmentBoard(projectId: $projectId) {
      project {
        ${PROJECT_SUMMARY_FIELDS}
      }
      assignments {
        ${PROJECT_ASSIGNMENT_FIELDS}
      }
      assignableUsers {
        ${ASSIGNABLE_USER_FIELDS}
      }
      assignableRoles {
        ${ASSIGNABLE_ROLE_FIELDS}
      }
      canAssign
    }
  }
`
