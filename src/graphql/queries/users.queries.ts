/**
 * User Queries - GraphQL queries for user operations
 */

import { UserFieldsFragment, UserDetailFragment } from '../fragments/user.fragments';

/**
 * Get paginated list of users
 * @param skip - Number of records to skip (for pagination)
 * @param limit - Number of records to return (max 1000)
 */
export const GET_USERS = `
  ${UserFieldsFragment}
  
  query GetUsers($page: Int, $pageSize: Int, $roleId: String) {
    users(page: $page, pageSize: $pageSize, roleId: $roleId) {
      items {
        ...UserFields
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

/**
 * Get single user by ID
 * Backend expects userId - see BACKEND_IMPLEMENTATION_STATE.md
 * @param userId - User ID (UUID)
 */
export const GET_USER = `
  ${UserDetailFragment}
  
  query GetUser($userId: String!) {
    user(userId: $userId) {
      ...UserDetail
    }
  }
`;

/**
 * Get currently authenticated user
 * Returns the user making the request
 */
export const GET_CURRENT_USER = `
  ${UserDetailFragment}
  
  query GetCurrentUser {
    currentUser {
      ...UserDetail
    }
  }
`;

/**
 * Get users by role name (lightweight, no fragments)
 * Used for Assembly user dropdown in BOM Collected by Assembly flow
 */
export const GET_USERS_BY_ROLE_NAME = `
  query GetUsersByRoleName($roleName: String!) {
    users(roleName: $roleName, pageSize: 200) {
      items {
        id
        firstName
        lastName
        username
      }
      total
    }
  }
`;

/**
 * Search users by query string (for command palette)
 * @param query - Search query
 * @param limit - Max results to return
 */
export const SEARCH_USERS = `
  query SearchUsers($query: String!, $limit: Int!) {
    users(skip: 0, limit: $limit) {
      items {
        id
        email
        roles
      }
    }
  }
`;
