/**
 * Authentication & Authorization Types
 * Central type definitions for all auth-related data
 */

// User & Auth (login is username-based)
export interface User {
  id: string
  email: string
  username?: string
  is_active: boolean
  roles: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: 'bearer'
}

export interface MeResponse {
  id: string
  email: string
  is_active: boolean
  roles: string[]
}

export interface MeFullResponse {
  user: User
  permissions: PermissionsResponse
  access_token: string
  token_type: 'bearer'
}

// Permissions
export interface FieldPermissions {
  read: boolean
  write: boolean
}

export interface EntityPermissions {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  list: boolean
  fields: {
    [fieldName: string]: FieldPermissions
  }
}

export interface PermissionsResponse {
  entities: {
    [entityName: string]: EntityPermissions
  }
}

// Auth Store State
export interface AuthState {
  // Data
  user: User | null
  permissions: PermissionsResponse | null
  accessToken: string | null
  refreshToken: string | null
  
  // Status
  isInitialized: boolean
  isLoading: boolean
  error: Error | null
  
  // Actions
  setUser: (user: User | null) => void
  setPermissions: (permissions: PermissionsResponse | null) => void
  setAccessToken: (token: string | null) => void
  setRefreshToken: (token: string | null) => void
  setError: (error: Error | null) => void
  setIsInitialized: (value: boolean) => void
  setIsLoading: (value: boolean) => void
  logout: () => void
  reset: () => void
}

// API Error
export interface ApiError {
  status: number
  message: string
  details?: Record<string, unknown>
}
