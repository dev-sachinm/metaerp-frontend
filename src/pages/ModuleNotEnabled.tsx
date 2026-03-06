import { useLocation, Link } from 'react-router-dom'

export default function ModuleNotEnabled() {
  const location = useLocation()
  const moduleId = (location.state as { moduleId?: string } | null)?.moduleId ?? 'unknown'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Feature not available</h1>
        <p className="text-slate-600 mb-6">
          The module <strong>{moduleId}</strong> is not enabled for your organization. Contact your
          administrator if you need access.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
