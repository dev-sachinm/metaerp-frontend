export const PROJECT_SUMMARY_FIELDS = `
  id
  projectNumber
  name
  status
  customerId
  customerName
  targetDate
  remainingDays
  isActive
`

export const PROJECT_ASSIGNMENT_FIELDS = `
  id
  projectId
  principalType
  principalId
  accessLevel
  assignedAt
  assignedBy
  assignedByUsername
`

export const ASSIGNABLE_USER_FIELDS = `
  id
  firstName
  lastName
  username
  email
`

export const ASSIGNABLE_ROLE_FIELDS = `
  id
  name
  description
`
