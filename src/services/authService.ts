/**
 * Authentication Service (GraphQL-based)
 * Handles all auth-related GraphQL operations
 * Provides utility functions for token management
 */

import { TOKEN_KEY } from '@/constants/api'

export const authService = {
  /**
   * Logout - clear token
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
  },

  /**
   * Check if user is logged in (has valid token)
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY)
  },

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  /**
   * Store token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },
}
