/**
 * Zustand Auth Store
 * Manages authentication state and user data
 */

import { create } from 'zustand'
import { AuthState, User, PermissionsResponse } from '@/types/auth'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/constants/api'
import { useModulesStore } from '@/stores/modulesStore'

const initialState: Omit<AuthState, 'setUser' | 'setPermissions' | 'setAccessToken' | 'setRefreshToken' | 'setError' | 'setIsInitialized' | 'setIsLoading' | 'logout' | 'reset'> = {
  user: null,
  permissions: null,
  accessToken: null,
  refreshToken: null,
  isInitialized: false,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user: User | null) => set({ user }),

  setPermissions: (permissions: PermissionsResponse | null) => set({ permissions }),

  setAccessToken: (token: string | null) => {
    // Also persist to localStorage
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    set({ accessToken: token })
  },

  setRefreshToken: (token: string | null) => {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
    set({ refreshToken: token })
  },

  setError: (error) => set({ error }),

  setIsInitialized: (value: boolean) => set({ isInitialized: value }),

  setIsLoading: (value: boolean) => set({ isLoading: value }),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    useModulesStore.getState().reset()
    set(initialState)
  },

  reset: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    useModulesStore.getState().reset()
    set(initialState)
  },
}))

// Initialize store with tokens from localStorage
const token = localStorage.getItem(TOKEN_KEY)
const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
if (token || refreshToken) {
  useAuthStore.setState({
    accessToken: token,
    refreshToken: refreshToken,
  })
}

// Selector hooks for better performance
export const useCurrentUser = () => useAuthStore((state) => state.user)
export const usePermissions = () => useAuthStore((state) => state.permissions)
export const useAccessToken = () => useAuthStore((state) => state.accessToken)
export const useIsInitialized = () => useAuthStore((state) => state.isInitialized)
export const useIsLoading = () => useAuthStore((state) => state.isLoading)
export const useAuthError = () => useAuthStore((state) => state.error)
