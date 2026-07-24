import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { consentManager } from '../consent-manager'
import { analytics } from '../analytics'
import { performanceTracking } from '../performance-tracking'
import '../analytics-init' // imports and registers the subscriber

describe('Consent & Analytics Integration', () => {
  beforeEach(() => {
    // Reset all states before each test
    consentManager.reset()
    analytics.reset()
    performanceTracking.stopTracking()
    performanceTracking.reset()

    // Clear localStorage and document.cookie
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
      document.cookie.split(';').forEach(c => {
        const eqPos = c.indexOf('=')
        const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim()
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should NOT initialize non-essential trackers on first load/pre-consent', () => {
    // Current preferences should be uninitialized (timestamp = 0)
    const preferences = consentManager.getPreferences()
    expect(preferences.timestamp).toBe(0)
    expect(preferences.analytics).toBe(false)
    expect(preferences.performance).toBe(false)

    // Check that trackers are not initialized
    // (analytics isInitialized should be false, and events empty)
    expect(analytics.getEvents()).toEqual([])
    
    // Attempt tracking pre-consent - should be ignored
    analytics.track('test_pre_consent', { val: 42 })
    expect(analytics.getEvents()).toEqual([])
  })

  it('should initialize trackers when consent is granted', () => {
    // Grant consent
    consentManager.consentAll()

    const preferences = consentManager.getPreferences()
    expect(preferences.analytics).toBe(true)
    expect(preferences.performance).toBe(true)
    expect(preferences.timestamp).toBeGreaterThan(0)

    // Trigger page view or track event post-consent
    analytics.track('test_post_consent', { val: 100 })
    
    // Settle events
    const events = analytics.getEvents()
    expect(events.length).toBeGreaterThan(0)
    expect(events.some(e => e.event === 'test_post_consent')).toBe(true)
  })

  it('should stop tracking and clear storage/cookies upon revocation', () => {
    // 1. Grant consent first
    consentManager.consentAll()
    
    // Set some mock cookies and localStorage items
    document.cookie = 'analytics_session=xyz123; path=/;'
    document.cookie = 'unrelated_cookie=keep_me; path=/;'
    window.localStorage.setItem('analytics_user_id', 'user_12345')
    window.localStorage.setItem('keep_localStorage', 'keep_me')

    // Track an event
    analytics.track('event_during_consent', { val: 200 })
    expect(analytics.getEvents().length).toBeGreaterThan(0)

    // 2. Revoke consent (reject all)
    consentManager.rejectAll()

    // Check that preferences are updated
    const preferences = consentManager.getPreferences()
    expect(preferences.analytics).toBe(false)
    expect(preferences.performance).toBe(false)

    // Check that analytics has been reset (no events stored, isInitialized is false)
    expect(analytics.getEvents()).toEqual([])

    // Any new tracking attempt should be ignored
    analytics.track('event_post_revocation', { val: 300 })
    expect(analytics.getEvents()).toEqual([])

    // Check that non-essential cookies and local storage were cleared
    const cookies = document.cookie
    expect(cookies).not.toContain('analytics_session')
    expect(cookies).toContain('unrelated_cookie') // essential / unrelated cookies should be kept

    const userIdStorage = window.localStorage.getItem('analytics_user_id')
    expect(userIdStorage).toBeNull()
    expect(window.localStorage.getItem('keep_localStorage')).toBe('keep_me')
  })

  it('should properly segment strictly-necessary cookies from optional categories', () => {
    const categories = consentManager.getCategories()
    
    const necessary = categories.find(cat => cat.id === 'necessary')
    const analyticsCat = categories.find(cat => cat.id === 'analytics')

    expect(necessary).toBeDefined()
    expect(necessary?.required).toBe(true)

    expect(analyticsCat).toBeDefined()
    expect(analyticsCat?.required).toBe(false)
  })
})
