import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/logger'
import { initMonitoring } from '@/lib/monitoring'

initMonitoring()

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      category: 'technical',
      error: event.reason,
      data: {
        source: 'window.unhandledrejection',
      },
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
