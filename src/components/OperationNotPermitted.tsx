import { ShieldX } from 'lucide-react'
import { OPERATION_NOT_PERMITTED_VIEW_MESSAGE } from '@/lib/graphqlErrors'

interface OperationNotPermittedProps {
  /** Optional context e.g. "view users" */
  context?: string
  className?: string
}

/**
 * Shown when a list or view fails due to permission (FORBIDDEN).
 * Use instead of "No records found" when the query/API returns permission denied.
 */
export function OperationNotPermitted({ context, className = '' }: OperationNotPermittedProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 py-12 px-6 text-center ${className}`}
      role="alert"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <ShieldX className="h-7 w-7" />
      </div>
      <p className="mt-4 font-semibold text-amber-900">
        {OPERATION_NOT_PERMITTED_VIEW_MESSAGE}
      </p>
      {context && (
        <p className="mt-1 text-sm text-amber-800">
          {context}
        </p>
      )}
    </div>
  )
}
