import { useCallback, useSyncExternalStore, useState } from 'react'
import { consentManager } from '@/lib/consent-manager'

export const POLICY_VERSION = '1.0'

export interface ConsentCategories {
  analytics: boolean
  marketing: boolean
  functional: boolean
}

export interface ConsentRecord {
  version: string
  timestamp: string
  categories: ConsentCategories
}

function _subscribe(listener: () => void): () => void {
  return consentManager.onConsentChange(listener)
}

function _getClientSnapshot(): ConsentRecord | null {
  const preferences = consentManager.getPreferences()
  // If preferences have not been initialized/saved yet, return null so banner shows
  if (preferences.timestamp === 0) {
    return null
  }
  return {
    version: preferences.version,
    timestamp: new Date(preferences.timestamp).toISOString(),
    categories: {
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      functional: preferences.functional,
    }
  }
}

const _getServerSnapshot = (): ConsentRecord | null => null

const _subscribeEmpty = (): (() => void) => () => {}
const _getLoadedClient = (): boolean => true
const _getLoadedServer = (): boolean => false

export interface UseCookieConsentReturn {
  consent: ConsentRecord | null
  hasConsent: (category: keyof ConsentCategories) => boolean
  acceptAll: () => void
  rejectNonEssential: () => void
  updateConsent: (categories: Partial<ConsentCategories>) => void
  isLoaded: boolean
  showBanner: boolean
  openPreferences: () => void
  isPreferencesOpen: boolean
  closePreferences: () => void
}

export function useCookieConsent(): UseCookieConsentReturn {
  const consent = useSyncExternalStore(_subscribe, _getClientSnapshot, _getServerSnapshot)
  const isLoaded = useSyncExternalStore(_subscribeEmpty, _getLoadedClient, _getLoadedServer)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)

  const showBanner =
    isLoaded && (consent === null || consent.version !== POLICY_VERSION)

  const hasConsent = useCallback(
    (category: keyof ConsentCategories): boolean => {
      return consent?.categories[category] ?? false
    },
    [consent],
  )

  const acceptAll = useCallback(() => {
    consentManager.consentAll()
    setIsPreferencesOpen(false)
  }, [])

  const rejectNonEssential = useCallback(() => {
    consentManager.rejectAll()
    setIsPreferencesOpen(false)
  }, [])

  const updateConsent = useCallback(
    (categories: Partial<ConsentCategories>) => {
      const current = consentManager.getPreferences()
      consentManager.updatePreferences({
        analytics: categories.analytics ?? current.analytics,
        performance: categories.analytics ?? current.analytics, // Sync performance with analytics
        marketing: categories.marketing ?? current.marketing,
        functional: categories.functional ?? current.functional,
      })
      setIsPreferencesOpen(false)
    },
    [],
  )

  const openPreferences = useCallback(() => {
    setIsPreferencesOpen(true)
  }, [])

  const closePreferences = useCallback(() => {
    setIsPreferencesOpen(false)
  }, [])

  return {
    consent,
    hasConsent,
    acceptAll,
    rejectNonEssential,
    updateConsent,
    isLoaded,
    showBanner,
    openPreferences,
    isPreferencesOpen,
    closePreferences,
  }
}
