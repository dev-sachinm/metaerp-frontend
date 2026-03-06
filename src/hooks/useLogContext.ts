import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { setLogContext } from '@/lib/logger'
import * as Sentry from '@sentry/react'
import LogRocket from 'logrocket'

/**
 * Hook that enriches all subsequent logs with auth-related context.
 * Should be used high in the tree (e.g. AppContent) so user_id/session_id are attached globally.
 * Also sets Sentry user and LogRocket identify for session association.
 */
export function useLogContext() {
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!user) {
      setLogContext({ userId: undefined })
      Sentry.setUser(null)
      return
    }

    // Try several reasonable identifiers without relying on exact shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyUser = user as any
    const userId =
      anyUser.id ??
      anyUser.username ??
      anyUser.email ??
      String(anyUser)

    setLogContext({ userId })
    Sentry.setUser({ id: userId })
    try {
      LogRocket.identify(userId, {
        name: anyUser.username ?? anyUser.email ?? userId,
      })
    } catch {
      // LogRocket may not be inited
    }
  }, [user])
}

