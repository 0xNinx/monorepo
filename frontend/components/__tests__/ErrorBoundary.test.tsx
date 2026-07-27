import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Thrower() {
  throw new Error('Boom')
}

function RetryHarness() {
  const [shouldThrow, setShouldThrow] = useState(true)

  if (shouldThrow) {
    return (
      <ErrorBoundary
        level="section"
        section="reviews"
        onRetry={() => setShouldThrow(false)}
      >
        <Thrower />
      </ErrorBoundary>
    )
  }

  return <div>Recovered section</div>
}

describe('ErrorBoundary', () => {
  it('renders fallback UI when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls retry handler when retry is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onRetry = vi.fn()

    render(
      <ErrorBoundary onRetry={onRetry} level="section">
        <Thrower />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('remounts section content when retry is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<RetryHarness />)

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('Recovered section')).toBeInTheDocument()
  })
})
