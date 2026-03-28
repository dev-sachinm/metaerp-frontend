/**
 * Axios instance with JWT token handling and error interceptors
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import { API_BASE_URL, TOKEN_KEY, AUTH_MESSAGES } from '@/constants/api'
import { OPERATION_NOT_PERMITTED_MESSAGE } from '@/lib/graphqlErrors'
import { toast } from 'sonner'
import { createCorrelationId, logger } from '@/lib/logger'

// Create axios instance
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor - Add JWT token and correlation id to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const correlationId = createCorrelationId()
    if (!config.headers) config.headers = {} as any
    ;(config.headers as any)['X-Correlation-ID'] = correlationId

    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      ;(config.headers as any).Authorization = `Bearer ${token}`
    }

    logger.info('HTTP request', {
      category: 'technical',
      data: {
        method: (config.method || 'GET').toUpperCase(),
        url: config.url,
        correlationId,
      },
    })
    return config
  },
  (error) => {
    logger.error('HTTP request setup failed', {
      category: 'technical',
      error,
    })
    return Promise.reject(error)
  }
)

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = []

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

// Response Interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }
    const status = error.response?.status
    const data = error.response?.data as Record<string, unknown> | undefined
    const correlationId =
      (originalRequest?.headers && (originalRequest.headers['X-Correlation-ID'] as string)) || undefined

    if (status && status >= 400) {
      logger.error('HTTP response error', {
        category: 'technical',
        error,
        data: {
          status,
          url: originalRequest?.url,
          method: originalRequest?.method,
          correlationId,
          response: data,
        },
      })
    }

    // 401 - Unauthorized (token expired or invalid)
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            return axiosInstance(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh token
        const response = await axiosInstance.post('/auth/refresh', {})
        const newToken = response.data.access_token
        
        if (newToken) {
          localStorage.setItem(TOKEN_KEY, newToken)
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
          }
          processQueue()
          return axiosInstance(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        processQueue(refreshError)
        localStorage.removeItem(TOKEN_KEY)
        toast.error(AUTH_MESSAGES.TOKEN_EXPIRED)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // 403 - Forbidden (operation not permitted)
    if (status === 403) {
      toast.error(OPERATION_NOT_PERMITTED_MESSAGE)
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
