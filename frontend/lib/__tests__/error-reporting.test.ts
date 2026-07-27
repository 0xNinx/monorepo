import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import { reportClientError } from '@/lib/error-reporting'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

describe('reportClientError', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalEndpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_URL
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_ERROR_REPORTING_URL = 'https://errors.example.com'
    fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }))
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    process.env.NEXT_PUBLIC_ERROR_REPORTING_URL = originalEndpoint
    fetchSpy.mockRestore()
  })

  it('scrubs PII and includes section context', async () => {
    window.history.pushState({}, '', '/properties/abc')

    await reportClientError({
      error: new Error('Payment failed for user@example.com'),
      level: 'section',
      section: 'property-reviews',
      userRole: 'tenant',
    })

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          level: 'section',
          section: 'property-reviews',
          userRole: 'tenant',
        }),
        extra: expect.objectContaining({
          pathname: '/properties/abc',
          sanitizedMessage: expect.stringContaining('[REDACTED_EMAIL]'),
        }),
      }),
    )

    expect(global.fetch).toHaveBeenCalledWith(
      'https://errors.example.com',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('[REDACTED_EMAIL]'),
      }),
    )
  })
})
