import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/stores/authStore'

/**
 * 404 Not Found Page
 * Shown when user navigates to an invalid route
 */
export default function NotFound() {
  const navigate = useNavigate()
  const user = useCurrentUser()

  const handleGoHome = () => {
    navigate('/', { replace: true })
  }

  const handleGoLogin = () => {
    navigate('/login', { replace: true })
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          {/* Animated gradient background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full opacity-20 blur-3xl animate-pulse" />
          </div>

          {/* 404 Text */}
          <div className="relative">
            <h1 className="text-9xl font-black bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              404
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-300" />
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-300" />
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200/50">
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
            Page Not Found
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <>
                <Button
                  onClick={handleGoHome}
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
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
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Go to Login
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

          {/* Help Links */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-3">Quick Links:</p>
            <div className="flex flex-wrap gap-3 justify-center text-sm">
              <button
                onClick={handleGoHome}
                className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
              >
                Dashboard
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={handleGoLogin}
                className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
              >
                Login
              </button>
              <span className="text-slate-300">•</span>
              <a
                href="mailto:support@metaerp.com"
                className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-slate-500 mt-8">
          Error Code: 404 | Page Not Found
        </p>
      </div>
    </div>
  )
}
