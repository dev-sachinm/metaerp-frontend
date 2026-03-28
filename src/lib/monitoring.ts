/**
 * Sentry and LogRocket initialization.
 * Run once at app bootstrap. Uses VITE_SENTRY_DSN and VITE_LOGROCKET_APP_ID.
 * PII is scrubbed; LogRocket session URL is attached to Sentry events.
 */

import * as Sentry from '@sentry/react'
import LogRocket from 'logrocket'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID as string | undefined
const isProd = import.meta.env.PROD

/** Scrub common PII/sensitive keys from Sentry event (beforeSend) */
function scrubSentryEvent(event: {
  extra?: Record<string, unknown>
  user?: Record<string, unknown>
  request?: { data?: unknown }
}) {
  const scrub = (obj: unknown): unknown => {
    if (obj == null) return obj
    if (typeof obj === 'string') return obj
    if (Array.isArray(obj)) return obj.map(scrub)
    if (typeof obj === 'object') {
      const out: Record<string, unknown> = {}
      const sensitive = /password|token|secret|authorization|auth|email|cookie/i
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k] = sensitive.test(k) ? '[REDACTED]' : scrub(v)
      }
      return out
    }
    return obj
  }
  if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>
  if (event.user) event.user = scrub(event.user) as Record<string, unknown>
  if (event.request?.data) event.request.data = scrub(event.request.data)
  return event
}

export function initMonitoring() {
  if (typeof window === 'undefined') return

  // LogRocket first so we can attach session URL to Sentry
  if (LOGROCKET_APP_ID?.trim()) {
    try {
      LogRocket.init(LOGROCKET_APP_ID.trim(), {
        dom: {
          inputSanitizer: true,
          textSanitizer: true,
        },
        network: {
          requestSanitizer: (req: any) => {
            if (!req) return req
            const headers = { ...(req.headers ?? {}) } as Record<string, unknown>
            const sensitive = /authorization|auth|cookie|token|password/i
            for (const key of Object.keys(headers)) {
              if (sensitive.test(key)) headers[key] = '[REDACTED]'
            }
            return { ...req, headers, body: req.body ? '[REDACTED]' : undefined }
          },
          responseSanitizer: (res: any) => {
            if (!res) return res
            return { ...res, body: res.body ? '[REDACTED]' : undefined }
          },
        },
      })
    } catch {
      // LogRocket failed to load; continue without it
    }
  }

  if (SENTRY_DSN?.trim()) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN.trim(),
        environment: import.meta.env.MODE || (isProd ? 'production' : 'development'),
        enabled: true,
        sendDefaultPii: false,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
            maskAllInputs: true,
          }),
        ],
        tracesSampleRate: isProd ? 0.2 : 1,
        replaysSessionSampleRate: isProd ? 0.1 : 0.5,
        replaysOnErrorSampleRate: 1,
        beforeSend(event) {
          scrubSentryEvent(event)
          const url = LogRocket.sessionURL ?? null
          if (url && event.extra) {
            event.extra.LogRocket = url
          }
          return event
        },
      })
      // Expose Sentry on window so our logger's prod strategy can use it
      ;(window as unknown as { Sentry: typeof Sentry }).Sentry = Sentry
    } catch {
      // Sentry failed to load; continue without it
    }
  }
}
