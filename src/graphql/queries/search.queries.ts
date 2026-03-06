/**
 * Search Queries - Unified data for command palette (filtered client-side by search string)
 * Backend: users(skip, limit) paginated; getRoles returns array (no pagination).
 */

/**
 * Fetch users and roles for command palette; filter by search string in the UI.
 */
export const GLOBAL_SEARCH = `
  query GlobalSearch($limit: Int!) {
    users(skip: 0, limit: $limit) {
      items {
        id
        firstName
        lastName
        username
        email
        roles
      }
    }
    getRoles {
      id
      name
      description
    }
  }
`;
