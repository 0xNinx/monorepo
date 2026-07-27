import { describe, expect, it, vi } from 'vitest'
import {
  OFFLINE_QUEUE_FAILURE_STORAGE_KEY,
  OFFLINE_QUEUE_STORAGE_KEY,
} from '@/lib/offline-queue'
import { clearAuthenticatedOfflineState } from '@/lib/offline-session'

describe('clearAuthenticatedOfflineState', () => {
  it('clears queued data, cache buckets, and notifies the service worker', async () => {
    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify([{ id: '1' }]))
    localStorage.setItem(
      OFFLINE_QUEUE_FAILURE_STORAGE_KEY,
      JSON.stringify([{ id: '2' }]),
    )

    const postMessage = vi.fn()
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: { postMessage } },
    })

    const deleteSpy = vi.fn(async () => true)
    const keysSpy = vi.fn(async () => ['shelterflex-static-v1', 'other-cache'])
    vi.stubGlobal('caches', {
      delete: deleteSpy,
      keys: keysSpy,
    })

    await clearAuthenticatedOfflineState()

    expect(localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).toBe('[]')
    expect(localStorage.getItem(OFFLINE_QUEUE_FAILURE_STORAGE_KEY)).toBe('[]')
    expect(postMessage).toHaveBeenCalledWith({
      type: 'CLEAR_AUTHENTICATED_STATE',
    })
    expect(deleteSpy).toHaveBeenCalledWith('shelterflex-static-v1')
    expect(deleteSpy).not.toHaveBeenCalledWith('other-cache')
  })
})
