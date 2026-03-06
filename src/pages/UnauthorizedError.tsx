import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'

/**
 * Unauthorized Error Page
 * Handles 401 (Unauthenticated) and 403 (Forbidden) errors
 */
export default function UnauthorizedError() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const type = searchParams.get('type') || '401' // '401' or '403'
  const resource = searchParams.get('resource') || ''
  const permission = searchParams.get('permission') || ''

  const is403 = type === '403'

  const handleGoLogin = () => {
    navigate('/login', { replace: true })
  }

  const handleGoHome = () => {
    navigate('/', { replace: true })
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="relative mb-8">
          {/* Animated gradient background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-20 blur-3xl animate-pulse" />
          </div>

          {/* Lock Icon */}
          <div className="relative flex justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {is403 ? (
                  // Shield Icon for 403
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                ) : (
                  // Lock Icon for 401
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )}
              </svg>
            </div>
          </div>

          {/* Error Code */}
          <div className="mt-6">
            <h1 className="text-6xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {is403 ? '403' : '401'}
            </h1>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-orange-200/50">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg ring-1 ring-slate-200/50">
              <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
                <img src="/logo.png" alt="MetaERP" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            {is403 ? 'Access Denied' : 'Authentication Required'}
          </h2>
          
          <p className="text-lg text-slate-600 mb-2 max-w-md mx-auto">
            {is403 
              ? "You don't have permission to access this resource."
              : 'Your session has expired or you need to log in.'}
          </p>

          {/* Permission Details (for 403) */}
          {is403 && (resource || permission) && (
            <div className="mt-4 mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-slate-700">
                {resource && (
                  <span className="block">
                    <span className="font-semibold">Resource:</span> {resource}
                  </span>
                )}
                {permission && (
                  <span className="block mt-1">
                    <span className="font-semibold">Required Permission:</span> {permission}
                  </span>
                )}
              </p>
            </div>
          )}

          {!is403 && (
            <p className="text-sm text-slate-500 mb-8">
              Please log in again to continue.
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            {is403 ? (
              <>
                <Button
                  onClick={handleGoHome}
                  size="lg"
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go to Dashboard
                </Button>
                <Button
                  onClick={handleGoBack}
                  variant="outline"
                  size="lg"
                  className="shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Go Back
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleGoLogin}
                  size="lg"
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login Again
                </Button>
                <Button
                  onClick={handleGoBack}
                  variant="outline"
                  size="lg"
                  className="shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Go Back
                </Button>
              </>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              {is403 
                ? 'If you believe you should have access, please contact your administrator.'
                : 'Having trouble logging in? Contact support for assistance.'}
            </p>
            <a
              href="mailto:support@metaerp.com"
              className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium mt-2 inline-block"
            >
              Contact Support
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-slate-500 mt-8">
          Error Code: {is403 ? '403 - Forbidden' : '401 - Unauthorized'}
        </p>
      </div>
    </div>
  )
}
