/**
 * Centralized GraphQL error handling for permission/forbidden and user-facing messages.
 * Use for list views, forms, and global client so we show "Operation not permitted"
 * instead of "No records found" or raw backend messages when the user lacks permission.
 */

const FORBIDDEN_CODE = 'FORBIDDEN'
const PERMISSION_MESSAGE_PATTERNS = [
  /not enough permissions/i,
  /permission denied/i,
  /do not have permission/i,
  /access denied/i,
]

/** User-facing message shown when an operation is not permitted */
export const OPERATION_NOT_PERMITTED_MESSAGE =
  'Operation not permitted. You do not have permission to perform this action.'

/** Message for list/view when user cannot access the resource */
export const OPERATION_NOT_PERMITTED_VIEW_MESSAGE =
  'Operation not permitted. You do not have permission to view this.'

/**
 * Returns true if the error is a permission/forbidden error from the backend.
 * Backend sends extensions.code === 'FORBIDDEN' or message like "Not enough permissions".
 */
export function isPermissionError(error: unknown): boolean {
  if (error == null) return false
  const err = error as {
    response?: {
      status?: number
      errors?: Array<{ message?: string; extensions?: { code?: string } }>
    }
    message?: string
  }
  // HTTP 403 (e.g. REST-style or GraphQL over HTTP)
  if (err.response?.status === 403) return true
  const code = err.response?.errors?.[0]?.extensions?.code
  if (code === FORBIDDEN_CODE) return true
  const message = err.response?.errors?.[0]?.message ?? err.message ?? ''
  return PERMISSION_MESSAGE_PATTERNS.some((pattern) => pattern.test(String(message)))
}

/**
 * Returns the user-facing message for an error: permission message if it's a permission
 * error, otherwise the original message or a generic fallback.
 */
export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (isPermissionError(error)) return OPERATION_NOT_PERMITTED_MESSAGE
  const err = error as { response?: { errors?: Array<{ message?: string }> }; message?: string }
  const message = err.response?.errors?.[0]?.message ?? err.message
  return (message && String(message).trim()) || fallback
}
