import {
  clearOfflineQueue,
  clearOfflineQueueFailures,
} from './offline-queue'

export async function clearAuthenticatedOfflineState() {
  clearOfflineQueue()
  clearOfflineQueueFailures()

  if (typeof window === 'undefined') {
    return
  }

  navigator.serviceWorker?.controller?.postMessage({
    type: 'CLEAR_AUTHENTICATED_STATE',
  })

  if (!('caches' in window)) {
    return
  }

  const cacheKeys = await caches.keys()
  await Promise.all(
    cacheKeys
      .filter((cacheKey) => cacheKey.startsWith('shelterflex-'))
      .map((cacheKey) => caches.delete(cacheKey)),
  )
}
