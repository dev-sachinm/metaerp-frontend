/**
 * GraphQL Fragments - Reusable field selections
 * These fragments ensure consistent field selections across queries
 * and reduce duplication. They will be used with code generation.
 */

/**
 * Basic user fields - minimal user information
 * Used for lists, references, and lightweight queries
 * Aligned with BACKEND_IMPLEMENTATION_STATE.md UserType (firstName, lastName, dateOfBirth, mobileNumber, username, email, isActive, roles)
 */
export const UserFieldsFragment = `
  fragment UserFields on UserType {
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
`;

/**
 * Detailed user fields - complete user information
 * Used for user detail pages and profile views
 */
export const UserDetailFragment = `
  fragment UserDetail on UserType {
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
`;

/**
 * Pagination metadata - reusable across all paginated queries
 * Provides info needed for pagination UI and auto-fetching
 */
export const PaginationInfoFragment = `
  fragment PaginationInfo on PaginatedUsersType {
    total
    skip
    limit
    page
    totalPages
    hasMore
  }
`;
