export type OfflineQueueMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface OfflineQueueEntry {
  id: string
  path: string
  method: OfflineQueueMethod
  body: string | null
  headers: Record<string, string>
  createdAt: string
  retryCount: number
}

export type FlushStatus = 'idle' | 'replaying' | 'completed' | 'partial' | 'failed'

export interface FlushProgress {
  status: FlushStatus
  processed: number
  total: number
  failedCount: number
}

const STORAGE_KEY = 'shelterflex-offline-queue'

const MAX_RETRIES_PER_ITEM = 3
const BASE_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 10_000

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage
}

function readQueue(): OfflineQueueEntry[] {
  const storage = getStorage()
  if (!storage) {
    return []
  }

  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as OfflineQueueEntry[]
  } catch {
    storage.removeItem(STORAGE_KEY)
    return []
  }
}

function writeQueue(entries: OfflineQueueEntry[]) {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(entries))
  window.dispatchEvent(
    new CustomEvent('offline-queue-updated', {
      detail: { count: entries.length },
    }),
  )
}

function isNonRetryable(status: number): boolean {
  if (status >= 400 && status < 500) {
    return status !== 409 && status !== 429
  }
  return false
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emitFlushEvent(progress: FlushProgress) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('offline-flush-progress', { detail: progress }),
  )
}

export function getOfflineQueueCount() {
  return readQueue().length
}

export function enqueueOfflineRequest(
  entry: Omit<OfflineQueueEntry, 'id' | 'createdAt' | 'retryCount'>,
) {
  const idempotencyKey = `idem_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`

  const entries = readQueue()
  entries.push({
    ...entry,
    id: `offline_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    headers: {
      ...entry.headers,
      'Idempotency-Key': idempotencyKey,
    },
    createdAt: new Date().toISOString(),
    retryCount: 0,
  })
  writeQueue(entries)
}

export function clearOfflineQueue() {
  writeQueue([])
}

export type ReconciliationCallback = (processed: number) => Promise<void>

export async function flushOfflineQueue(
  baseUrl: string,
  onReconcile?: ReconciliationCallback,
): Promise<number> {
  const entries = readQueue()
  if (!entries.length) {
    emitFlushEvent({ status: 'completed', processed: 0, total: 0, failedCount: 0 })
    return 0
  }

  emitFlushEvent({
    status: 'replaying',
    processed: 0,
    total: entries.length,
    failedCount: 0,
  })

  const remaining: OfflineQueueEntry[] = []
  let processed = 0
  let failedCount = 0

  for (const entry of entries) {
    if (entry.retryCount >= MAX_RETRIES_PER_ITEM) {
      remaining.push(entry)
      failedCount += 1
      continue
    }

    try {
      const response = await fetch(`${baseUrl}${entry.path}`, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      })

      if (isNonRetryable(response.status)) {
        failedCount += 1
        continue
      }

      if (!response.ok) {
        entry.retryCount += 1
        remaining.push(entry)
        failedCount += 1

        const delay = Math.min(
          BASE_BACKOFF_MS * Math.pow(2, entry.retryCount - 1) +
            Math.random() * BASE_BACKOFF_MS,
          MAX_BACKOFF_MS,
        )
        emitFlushEvent({
          status: 'replaying',
          processed,
          total: entries.length,
          failedCount,
        })
        await sleep(delay)
        continue
      }

      processed += 1
      emitFlushEvent({
        status: 'replaying',
        processed,
        total: entries.length,
        failedCount,
      })
    } catch {
      entry.retryCount += 1
      remaining.push(entry)
      failedCount += 1

      const delay = Math.min(
        BASE_BACKOFF_MS * Math.pow(2, entry.retryCount - 1) +
          Math.random() * BASE_BACKOFF_MS,
        MAX_BACKOFF_MS,
      )
      emitFlushEvent({
        status: 'replaying',
        processed,
        total: entries.length,
        failedCount,
      })
      await sleep(delay)
    }
  }

  writeQueue(remaining)

  const status: FlushStatus =
    processed === 0 ? 'failed' : failedCount > 0 ? 'partial' : 'completed'

  emitFlushEvent({
    status,
    processed,
    total: entries.length,
    failedCount,
  })

  if (processed > 0 && onReconcile) {
    await onReconcile(processed)
  }

  return processed
}
