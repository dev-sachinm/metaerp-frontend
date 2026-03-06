import type { AuthState } from '@/types/auth'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'business' | 'technical'

export interface LogContext {
  userId?: string
  sessionId?: string
  correlationId?: string
  [key: string]: unknown
}

export interface LogOptions {
  context?: LogContext
  data?: unknown
  error?: unknown
  category?: LogCategory
}

interface LogPayload {
  level: LogLevel
  message: string
  context?: LogContext
  data?: unknown
  error?: unknown
  category?: LogCategory
  timestamp: string
}

interface LoggerStrategy {
  log(payload: LogPayload): void
}

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const SENSITIVE_KEY_REGEX = /(password|token|secret|authorization|authHeader)/i

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Redact email-like patterns
    return value.replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item))
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = scrubValue(v)
      }
    }
    return result
  }

  return value
}

function scrubPayload(payload: LogPayload): LogPayload {
  return {
    ...payload,
    data: scrubValue(payload.data),
    error:
      payload.error instanceof Error
        ? {
            name: payload.error.name,
            message: payload.error.message,
            stack: payload.error.stack,
          }
        : scrubValue(payload.error),
    context: payload.context ? (scrubValue(payload.context) as LogContext) : undefined,
  }
}

// Session id is generated once per browser and persisted locally
const SESSION_STORAGE_KEY = 'metaerp_session_id'

function generateId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return `${prefix}_${(crypto as any).randomUUID()}`
    }
  } catch {
    // ignore and fall through
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function getOrCreateSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const created = generateId('sess')
    window.localStorage.setItem(SESSION_STORAGE_KEY, created)
    return created
  } catch {
    return undefined
  }
}

export function createCorrelationId(): string {
  return generateId('corr')
}

let baseContext: LogContext = {
  sessionId: getOrCreateSessionId(),
}

export function setLogContext(partial: Partial<LogContext>) {
  baseContext = {
    ...baseContext,
    ...partial,
  }
}

export function getLogContext(): LogContext {
  return { ...baseContext }
}

// Development strategy: pretty console logging with colors
class DevLoggerStrategy implements LoggerStrategy {
  log(payload: LogPayload): void {
    const scrubbed = scrubPayload(payload)
    const { level, message, timestamp, category, context, data, error } = scrubbed

    const base = `%c[${level.toUpperCase()}]%c ${message}`
    const timeSuffix = ` %c@ ${timestamp}`

    const levelColor =
      level === 'error'
        ? 'color:#b91c1c;font-weight:bold;'
        : level === 'warn'
          ? 'color:#92400e;font-weight:bold;'
          : level === 'info'
            ? 'color:#0369a1;font-weight:bold;'
            : 'color:#64748b;font-weight:bold;'

    const msgColor = 'color:#0f172a;'
    const timeColor = 'color:#6b7280;font-style:italic;'

    // eslint-disable-next-line no-console
    console.log(base + timeSuffix, levelColor, msgColor, timeColor, {
      category,
      context,
      data,
      error,
    })
  }
}

// Production strategy: integrate with Sentry if available, otherwise minimal console
class ProdLoggerStrategy implements LoggerStrategy {
  log(payload: LogPayload): void {
    const scrubbed = scrubPayload(payload)
    const { level, message, timestamp, category, context, data, error } = scrubbed

    // If Sentry is available globally, send structured event
    if (typeof window !== 'undefined') {
      const sentry = (window as unknown as { Sentry?: { captureException: (e: unknown, ctx?: unknown) => void } }).Sentry
      if (sentry && level === 'error') {
        sentry.captureException(error ?? new Error(message), {
          level,
          tags: {
            category: category ?? 'technical',
          },
          extra: {
            timestamp,
            context,
            data,
          },
        })
        return
      }
    }

    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(line, { category, context, data, error })
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(line, { category, context, data })
    } else {
      // eslint-disable-next-line no-console
      console.log(line, { category, context, data })
    }
  }
}

const strategy: LoggerStrategy = import.meta.env.DEV ? new DevLoggerStrategy() : new ProdLoggerStrategy()

function baseLog(level: LogLevel, message: string, options?: LogOptions) {
  const now = new Date()
  const timestamp = now.toISOString()
  const mergedContext: LogContext = {
    ...getLogContext(),
    ...(options?.context ?? {}),
  }

  const payload: LogPayload = {
    level,
    message,
    timestamp,
    context: Object.keys(mergedContext).length ? mergedContext : undefined,
    data: options?.data,
    error: options?.error,
    category: options?.category,
  }

  strategy.log(payload)
}

export const logger = {
  debug(message: string, options?: LogOptions) {
    baseLog('debug', message, options)
  },
  info(message: string, options?: LogOptions) {
    baseLog('info', message, options)
  },
  warn(message: string, options?: LogOptions) {
    baseLog('warn', message, options)
  },
  error(message: string, options?: LogOptions) {
    baseLog('error', message, options)
  },
}

// Convenience helper for attaching auth context from the store (non-hook usage)
export function attachAuthContext(authState: Pick<AuthState, 'user'>) {
  const user = authState.user
  if (!user) {
    setLogContext({ userId: undefined })
    return
  }

  const userId =
    // Try several reasonable identifiers without knowing exact shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user as any).id ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user as any).username ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user as any).email ??
    String(user)

  setLogContext({ userId })
}

