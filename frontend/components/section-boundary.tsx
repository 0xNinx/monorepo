'use client'

import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface SectionBoundaryProps {
  children: ReactNode
  section: string
  userRole: 'tenant' | 'landlord' | 'guest'
}

export function SectionBoundary({
  children,
  section,
  userRole,
}: SectionBoundaryProps) {
  return (
    <ErrorBoundary level="section" section={section} userRole={userRole}>
      {children}
    </ErrorBoundary>
  )
}
