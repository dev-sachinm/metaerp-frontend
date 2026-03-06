import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  featureName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Feature Error Boundary - Catches errors in specific features/sections
 * Shows contained error UI without crashing the entire app
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const featureName = this.props.featureName || 'Feature'
    console.error(`${featureName} Error:`, error, errorInfo)
    
    // TODO: Send to error monitoring service
    // Example: Sentry.captureException(error, { tags: { feature: featureName } })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const featureName = this.props.featureName || 'This section'
      const isDevelopment = import.meta.env.DEV

      return (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              {/* Error Icon */}
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  Something went wrong
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {featureName} encountered an error and couldn't load properly.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Message (Dev Only) */}
            {isDevelopment && this.state.error && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                <p className="text-xs font-mono text-red-900 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Reload Page
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-slate-500">
              If this problem persists, try refreshing the page or contact support.
            </p>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
