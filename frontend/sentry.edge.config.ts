import * as Sentry from "@sentry/nextjs"
import { scrubEvent, scrubBreadcrumb } from "./lib/pii-scrubber"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  beforeSend(event) {
    return scrubEvent(event)
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb)
  },
})
