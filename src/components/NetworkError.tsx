import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface NetworkErrorProps {
  onRetry?: () => void
}

/**
 * Network Error Component
 * Shows a banner when network/API errors occur or user goes offline
 */
export function NetworkError({ onRetry }: NetworkErrorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [show, setShow] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-hide after 3 seconds when back online
      setTimeout(() => setShow(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShow(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  const handleDismiss = () => {
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      {/* Error Banner (non-blocking; do not lock entire UI) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-top duration-300 pointer-events-none">
        <div
          className={`rounded-xl shadow-2xl border-2 overflow-hidden ${
            isOnline
              ? 'bg-gradient-to-r from-emerald-500 to-green-500 border-emerald-400'
              : 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400'
          } pointer-events-auto`}
        >
          <div className="p-4 flex items-center gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                {isOnline ? (
                  // Success/Online Icon
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  // Offline Icon
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                  </svg>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-lg leading-tight">
                {isOnline ? 'Back Online!' : 'Connection Lost'}
              </h3>
              <p className="text-white/90 text-sm mt-1">
                {isOnline
                  ? 'Your connection has been restored.'
                  : 'Unable to connect to the server. Check your internet connection.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isOnline && (
                <Button
                  onClick={handleRetry}
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30 shadow-lg"
                  variant="outline"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </Button>
              )}
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Animated progress bar (only when offline) */}
          {!isOnline && (
            <div className="h-1 bg-white/20">
              <div className="h-full w-full bg-white/40 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/**
 * Hook to show/hide network error
 */
export function useNetworkError() {
  const [showError, setShowError] = useState(false)
  const [retryCallback, setRetryCallback] = useState<(() => void) | undefined>()

  const showNetworkError = (onRetry?: () => void) => {
    setShowError(true)
    setRetryCallback(() => onRetry)
  }

  const hideNetworkError = () => {
    setShowError(false)
    setRetryCallback(undefined)
  }

  return {
    showError,
    showNetworkError,
    hideNetworkError,
    NetworkErrorComponent: showError ? <NetworkError onRetry={retryCallback} /> : null,
  }
}
