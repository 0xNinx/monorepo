/**
 * PII Scrubber for Sentry Error Reporting
 * 
 * This module provides centralized PII redaction for error events and breadcrumbs.
 * It redacts sensitive data before sending to external monitoring services.
 */

// Sensitive field names to redact (case-insensitive)
const SENSITIVE_FIELDS = [
  'token',
  'apikey',
  'api_key',
  'secret',
  'password',
  'passwd',
  'auth',
  'authorization',
  'bearer',
  'session',
  'sessionid',
  'session_id',
  'csrf',
  'xsrf',
  'jwt',
  'access_token',
  'refresh_token',
  'id_token',
  'email',
  'phone',
  'mobile',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
  'dob',
  'birth_date',
  'address',
  'zipcode',
  'postal_code',
  'document_key',
  'document_id',
  'doc_key',
  'doc_id',
  'user_id',
  'userid',
  'customer_id',
  'account_number',
  'iban',
  'routing_number',
  'cookie',
  'set-cookie',
]

// Fields that should be completely replaced with [REDACTED] (not pattern-redacted)
const STRICTLY_SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'auth',
  'authorization',
  'bearer',
  'csrf',
  'xsrf',
  'cvv',
  'pin',
  'cookie',
  'set-cookie',
  'email', // Email fields should be completely redacted
  'phone', // Phone fields should be completely redacted
]

// Sensitive query parameter names to redact
const SENSITIVE_QUERY_PARAMS = [
  'token',
  'apikey',
  'api_key',
  'key',
  'secret',
  'password',
  'auth',
  'bearer',
  'session',
  'sessionid',
  'jwt',
  'access_token',
  'refresh_token',
  'id_token',
  'email',
  'phone',
  'ssn',
  'card',
  'cvv',
  'pin',
]

// Regex patterns for detecting PII in strings
const PII_PATTERNS = [
  // Document keys (specific patterns must come before generic key pattern)
  {
    pattern: /\bdoc_[a-zA-Z0-9]{10,}\b/gi,
    replacement: '[REDACTED_DOC_KEY]',
  },
  {
    pattern: /\bdocument_[a-zA-Z0-9]{10,}\b/gi,
    replacement: '[REDACTED_DOC_KEY]',
  },
  // JWT tokens (base64 with dots)
  {
    pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    replacement: '[REDACTED_JWT]',
  },
  // UUID-like tokens
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: '[REDACTED_UUID]',
  },
  // Email addresses
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[REDACTED_EMAIL]',
  },
  // Phone numbers (various formats)
  {
    pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  {
    pattern: /\b\+?1?[-.]?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  // API keys (alphanumeric strings 20+ chars) - must come after specific patterns
  {
    pattern: /\b[a-zA-Z0-9_-]{20,}\b/g,
    replacement: '[REDACTED_KEY]',
  },
]

/**
 * Redact PII from a string using regex patterns
 */
export function redactString(value: string): string {
  let redacted = value
  
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement)
  }
  
  return redacted
}

/**
 * Check if a field name is sensitive
 */
export function isSensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase()
  return SENSITIVE_FIELDS.some(field => normalized.includes(field))
}

/**
 * Check if a field name is strictly sensitive (should be completely redacted)
 */
function isStrictlySensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase()
  return STRICTLY_SENSITIVE_FIELDS.some(field => normalized.includes(field))
}

/**
 * Check if a query parameter name is sensitive
 */
export function isSensitiveQueryParam(paramName: string): boolean {
  const normalized = paramName.toLowerCase()
  return SENSITIVE_QUERY_PARAMS.some(param => normalized.includes(param))
}

/**
 * Redact PII from an object recursively
 */
export function redactObject(obj: any, depth = 0): any {
  if (depth > 10) {
    return '[REDACTED_MAX_DEPTH]'
  }
  
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'string') {
    return redactString(obj)
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, depth + 1))
  }
  
  if (typeof obj === 'object') {
    const redacted: any = {}
    
    for (const [key, value] of Object.entries(obj)) {
      // First apply pattern-based redaction to the value
      const patternRedacted = redactObject(value, depth + 1)
      
      // Then if the field name is strictly sensitive, replace with [REDACTED]
      // Otherwise keep the pattern-redacted value
      if (isStrictlySensitiveField(key)) {
        redacted[key] = '[REDACTED]'
      } else {
        redacted[key] = patternRedacted
      }
    }
    
    return redacted
  }
  
  return obj
}

/**
 * Strip sensitive query parameters from a URL
 */
export function stripSensitiveQueryParams(url: string): string {
  try {
    const urlObj = new URL(url)
    
    for (const param of urlObj.searchParams.keys()) {
      if (isSensitiveQueryParam(param)) {
        urlObj.searchParams.set(param, '[REDACTED]')
      }
    }
    
    return urlObj.toString()
  } catch {
    // If URL parsing fails, redact the string directly
    return redactString(url)
  }
}

/**
 * Redact PII from a URL (both path and query params)
 */
export function redactUrl(url: string): string {
  const stripped = stripSensitiveQueryParams(url)
  return redactString(stripped)
}

/**
 * Redact headers object
 */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(headers)) {
    // First apply pattern-based redaction to the value
    const patternRedacted = redactString(value)
    
    // Then if the field name is strictly sensitive, replace with [REDACTED]
    if (isStrictlySensitiveField(key)) {
      redacted[key] = '[REDACTED]'
    } else {
      redacted[key] = patternRedacted
    }
  }
  
  return redacted
}

/**
 * Scrub a Sentry event before sending
 */
export function scrubEvent(event: any): any {
  // Scrub request data
  if (event.request) {
    if (event.request.url) {
      event.request.url = redactUrl(event.request.url)
    }
    
    if (event.request.query_string) {
      event.request.query_string = redactObject(event.request.query_string)
    }
    
    if (event.request.headers) {
      event.request.headers = redactHeaders(event.request.headers)
    }
    
    // Always delete cookies
    delete event.request.cookies
  }
  
  // Scrub user data
  if (event.user) {
    event.user = redactObject(event.user)
  }
  
  // Scrub extra data
  if (event.extra) {
    event.extra = redactObject(event.extra)
  }
  
  // Scrub contexts
  if (event.contexts) {
    event.contexts = redactObject(event.contexts)
  }
  
  // Scrub exception messages
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = redactString(exception.value)
      }
      if (exception.type) {
        exception.type = redactString(exception.type)
      }
    }
  }
  
  // Scrub message
  if (event.message) {
    event.message = redactString(event.message)
  }
  
  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb: any) => scrubBreadcrumb(crumb))
  }
  
  return event
}

/**
 * Scrub a Sentry breadcrumb
 */
export function scrubBreadcrumb(breadcrumb: any): any {
  const scrubbed = { ...breadcrumb }
  
  if (scrubbed.message) {
    scrubbed.message = redactString(scrubbed.message)
  }
  
  if (scrubbed.data) {
    scrubbed.data = redactObject(scrubbed.data)
  }
  
  // Special handling for navigation breadcrumbs
  if (scrubbed.category === 'navigation' && scrubbed.data) {
    if (scrubbed.data.from) {
      scrubbed.data.from = redactUrl(scrubbed.data.from)
    }
    if (scrubbed.data.to) {
      scrubbed.data.to = redactUrl(scrubbed.data.to)
    }
  }
  
  // Special handling for HTTP breadcrumbs
  if (scrubbed.category === 'http' && scrubbed.data) {
    if (scrubbed.data.url) {
      scrubbed.data.url = redactUrl(scrubbed.data.url)
    }
    if (scrubbed.data.request_headers) {
      scrubbed.data.request_headers = redactHeaders(scrubbed.data.request_headers)
    }
    if (scrubbed.data.response_headers) {
      scrubbed.data.response_headers = redactHeaders(scrubbed.data.response_headers)
    }
  }
  
  return scrubbed
}
