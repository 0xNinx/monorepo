import * as Sentry from "@sentry/nextjs"
import { redactString } from "./pii-scrubber"

type ErrorReportLevel = 'page' | 'section'

interface ErrorReportPayload {
  error: Error
  componentStack?: string
  level: ErrorReportLevel
  section?: string
  userRole?: string
}

function buildEventId() {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeMessage(message: string) {
  const sanitized = message.slice(0, 300)
  return redactString(sanitized)
}

export async function reportClientError({
  error,
  componentStack,
  level,
  section,
  userRole,
}: ErrorReportPayload): Promise<string | null> {
  const eventId = buildEventId()
  const pathname = typeof window !== 'undefined' ? window.location.pathname : undefined
  const sanitizedMessage = sanitizeMessage(error.message)
  
  // Send error to Sentry
  Sentry.captureException(error, {
    tags: {
      level,
      section: section ?? 'unknown',
      userRole: userRole ?? 'unknown',
      componentStack: componentStack ? 'present' : 'absent',
    },
    extra: {
      componentStack:
        process.env.NODE_ENV === 'production'
          ? undefined
          : componentStack?.slice(0, 1500),
      pathname,
      sanitizedMessage,
      eventId,
    },
  })

  if (process.env.NODE_ENV !== 'production') {
    console.error('Client error report:', {
      eventId,
      level,
      pathname,
      section,
      userRole,
      message: sanitizedMessage,
      name: error.name,
    })
    return eventId
  }

  const endpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_URL
  if (!endpoint) {
    return eventId
  }

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        level,
        section,
        userRole,
        pathname,
        message: sanitizedMessage,
        name: error.name,
        componentStack:
          process.env.NODE_ENV === 'production' ? undefined : componentStack?.slice(0, 1500),
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    })
  } catch {
    return eventId
  }

  return eventId
}
