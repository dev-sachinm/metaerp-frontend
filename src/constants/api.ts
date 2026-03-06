/**
 * Constants for environment and API configuration
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// Access token (short-lived, used in Authorization header)
export const TOKEN_KEY = 'accessToken'

// Refresh token (long-lived, used only to get new access tokens)
// Note: In a real production app this is ideally an HttpOnly cookie set by the backend.
// For this demo/frontend-only flow we keep it in localStorage alongside the access token.
export const REFRESH_TOKEN_KEY = 'refreshToken'

export const PERMISSIONS_CACHE_TIME = 5 * 60 * 1000 // 5 minutes
export const PERMISSIONS_STALE_TIME = 10 * 60 * 1000 // 10 minutes

// Auth-related messages
export const AUTH_MESSAGES = {
  LOGIN_FAILED: 'Login failed. Please check your username and password.',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  UNAUTHORIZED: 'Unauthorized. Please login.',
}

// Entity names (matches backend)
export const ENTITIES = {
  USER: 'user',
  PROJECT: 'project',
  FIXTURE: 'fixture',
  PART: 'part',
  STANDARD_PART: 'standard_part',
} as const

// Actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
} as const
