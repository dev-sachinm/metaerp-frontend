/**
 * Authentication Mutations - GraphQL mutations for auth operations
 * Login is username-based; returns user (id, username, email?, isActive) and permissions.byRole.
 */

/**
 * Login mutation - authenticate with username and password
 * Returns tokens, user (no roles field), and permissions grouped by role.
 * Role names are the keys of permissions.byRole.
 */
export const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
      refreshToken
      tokenType
      user {
        id
        username
        email
        isActive
      }
      permissions {
        byRole
      }
    }
  }
`;

/**
 * Refresh token mutation - get new access token using refresh token
 * @param refreshToken - Current refresh token
 * @returns New access token
 */
export const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refresh(refreshToken: $refreshToken) {
      accessToken
      tokenType
    }
  }
`;
