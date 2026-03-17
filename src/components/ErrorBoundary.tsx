import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Global Error Boundary - Catches catastrophic errors that crash the entire app
 * Displays full-page error UI with recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Global Error Boundary caught an error', {
      category: 'technical',
      error,
      data: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  copyErrorDetails = () => {
    const { error, errorInfo } = this.state
    const errorText = `
Error: ${error?.toString()}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}
    `.trim()

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard!')
    })
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state
      const isDevelopment = import.meta.env.DEV

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Error Card */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-red-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-8 py-6">
                <div className="flex items-center gap-4">
                  {/* Error Icon */}
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Application Error</h1>
                    <p className="text-red-100 mt-1">Something went wrong</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Error Message */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Error Details</h2>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-mono text-red-800 break-words">
                      {error?.toString()}
                    </p>
                  </div>
                </div>

                {/* Stack Trace (Dev Only) */}
                {isDevelopment && error?.stack && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Stack Trace</h2>
                    <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 max-h-64 overflow-auto">
                      <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Component Stack (Dev Only) */}
                {isDevelopment && errorInfo?.componentStack && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Component Stack</h2>
                    <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 max-h-48 overflow-auto">
                      <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={this.handleReload}
                    className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reload Page
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Go to Home
                  </Button>
                  {isDevelopment && (
                    <Button
                      onClick={this.copyErrorDetails}
                      variant="outline"
                      className="flex-1"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Error
                    </Button>
                  )}
                </div>

                {/* Help Text */}
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    If this problem persists, please contact support with the error details above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
