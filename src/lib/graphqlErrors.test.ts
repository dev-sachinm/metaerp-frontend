import { describe, it, expect } from 'vitest'
import {
  isPermissionError,
  getErrorMessage,
  OPERATION_NOT_PERMITTED_MESSAGE,
} from './graphqlErrors'

describe('graphqlErrors', () => {
  describe('isPermissionError', () => {
    it('returns false for null or undefined', () => {
      expect(isPermissionError(null)).toBe(false)
      expect(isPermissionError(undefined)).toBe(false)
    })

    it('returns true when response.status is 403', () => {
      expect(isPermissionError({ response: { status: 403 } })).toBe(true)
    })

    it('returns true when extensions.code is FORBIDDEN', () => {
      expect(
        isPermissionError({
          response: {
            errors: [{ extensions: { code: 'FORBIDDEN' } }],
          },
        })
      ).toBe(true)
    })

    it('returns true when message matches permission patterns', () => {
      expect(
        isPermissionError({
          response: { errors: [{ message: 'Not enough permissions' }] },
        })
      ).toBe(true)
      expect(
        isPermissionError({
          response: { errors: [{ message: 'Permission denied' }] },
        })
      ).toBe(true)
      expect(
        isPermissionError({
          message: 'You do not have permission to access this',
        })
      ).toBe(true)
      expect(
        isPermissionError({
          response: { errors: [{ message: 'Forbidden action' }] },
        })
      ).toBe(true)
    })

    it('returns false for generic errors', () => {
      expect(isPermissionError({ response: { status: 500 } })).toBe(false)
      expect(
        isPermissionError({
          response: { errors: [{ message: 'Internal server error' }] },
        })
      ).toBe(false)
      expect(isPermissionError(new Error('Network error'))).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('returns OPERATION_NOT_PERMITTED_MESSAGE for permission errors', () => {
      expect(getErrorMessage({ response: { status: 403 } })).toBe(
        OPERATION_NOT_PERMITTED_MESSAGE
      )
      expect(
        getErrorMessage({
          response: { errors: [{ extensions: { code: 'FORBIDDEN' } }] },
        })
      ).toBe(OPERATION_NOT_PERMITTED_MESSAGE)
    })

    it('returns first GraphQL error message for non-permission errors', () => {
      expect(
        getErrorMessage({
          response: { errors: [{ message: 'Validation failed' }] },
        })
      ).toBe('Validation failed')
    })

    it('returns error.message when no response.errors', () => {
      expect(getErrorMessage({ message: 'Something broke' })).toBe(
        'Something broke'
      )
    })

    it('returns fallback when no message available', () => {
      expect(getErrorMessage({})).toBe('An error occurred')
      expect(getErrorMessage({}, 'Custom fallback')).toBe('Custom fallback')
    })
  })
})
