/**
 * Sentry Client Configuration
 * 
 * Classification: Strictly Necessary (Always-On)
 * 
 * Rationale under GDPR/NDPR:
 * Sentry error reporting is classified as "Strictly Necessary" / "Essential" because it is
 * required to monitor the stability, performance, diagnostics, and security of the Shelterflex platform.
 * It is not used for behavioural tracking, user profiling, or marketing purposes.
 * 
 * Privacy Compliance:
 * To ensure user privacy remains uncompromised, we aggressively scrub all Personally Identifiable Information (PII)
 * such as authorization headers, session cookies, passwords, email addresses, phone numbers, and IP addresses
 * in the `beforeSend` hook before transmission.
 */

import * as Sentry from "@sentry/nextjs"
import { scrubEvent, scrubBreadcrumb } from "./lib/pii-scrubber"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.05,
  beforeSend(event) {
    // Filter out noise errors
    if (event.exception) {
      const message = event.exception.values?.[0]?.value || ""
      
      // Filter out common noise errors
      const noisePatterns = [
        /Non-Error promise rejection/i,
        /ResizeObserver loop limit exceeded/i,
        /Script error/i,
        /Network request failed/i,
        /Loading chunk \d+ failed/i,
        /Failed to fetch/i,
      ]
      
      if (noisePatterns.some(pattern => pattern.test(message))) {
        return null
      }
    }
    
    // Scrub PII from event data
    return scrubEvent(event)
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb)
  },
})
