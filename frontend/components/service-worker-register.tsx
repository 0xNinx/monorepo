'use client'

import { useEffect } from 'react'
import { flushOfflineQueue } from '@/lib/offline-queue'

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let hasReloadedForUpdate = false

    const requestWaitingWorkerActivation = (
      registration: ServiceWorkerRegistration | undefined,
    ) => {
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    }

    const flushQueue = async () => {
      if (!baseUrl || !navigator.onLine) {
        return
      }

      await flushOfflineQueue(baseUrl)
    }

    const handleControllerChange = () => {
      if (hasReloadedForUpdate) {
        return
      }
      hasReloadedForUpdate = true
      window.location.reload()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void navigator.serviceWorker.getRegistration().then((registration) => {
          void registration?.update()
        })
      }
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        requestWaitingWorkerActivation(registration)
        void registration.update()

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) {
            return
          }

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              requestWaitingWorkerActivation(registration)
            }
          })
        })
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to register service worker', error)
        }
      }
    }

    void registerServiceWorker()
    void flushQueue()
    window.addEventListener('online', flushQueue)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      window.removeEventListener('online', flushQueue)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      )
    }
  }, [])

  return null
}
