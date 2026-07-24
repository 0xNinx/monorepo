import { useRef, useCallback } from "react"

const EXPIRY_DAYS = 7

interface DraftEntry<T> {
  data: T
  savedAt: number
}

/**
 * Lightweight localStorage draft hook with debounced save and 7-day expiry.
 * Safe for fields that are non-sensitive (no raw credentials or documents).
 */
export function useDraftPersist<T>(key: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (data: T, debounceMs = 500) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        try {
          const entry: DraftEntry<T> = { data, savedAt: Date.now() }
          localStorage.setItem(key, JSON.stringify(entry))
        } catch {
          // Ignore: storage unavailable (full, private mode, SSR)
        }
      }, debounceMs)
    },
    [key],
  )

  const load = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const { data, savedAt }: DraftEntry<T> = JSON.parse(raw)
      if (Date.now() - savedAt > EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key)
        return null
      }
      return data
    } catch {
      return null
    }
  }, [key])

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.removeItem(key)
  }, [key])

  return { save, load, clear }
}
