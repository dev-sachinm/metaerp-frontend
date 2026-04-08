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
  
  query GetUsers($skip: Int!, $limit: Int!, $roleId: String) {
    users(skip: $skip, limit: $limit, roleId: $roleId) {
      items {
        ...UserFields
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
