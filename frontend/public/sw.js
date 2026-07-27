const VERSION = 'v2'
const STATIC_CACHE = `shelterflex-static-${VERSION}`
const RUNTIME_CACHE = `shelterflex-runtime-${VERSION}`
const OFFLINE_URL = '/offline.html'
const STATIC_ASSETS = ['/', '/offline.html', '/icon.svg']

function isCacheableRuntimeAsset(request, url) {
  if (url.origin !== self.location.origin) {
    return false
  }

  if (request.headers.get('authorization')) {
    return false
  }

  return ['script', 'style', 'font', 'image', 'manifest'].includes(
    request.destination,
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS.map((asset) => new Request(asset, { cache: 'reload' }))),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  const isNavigation = request.mode === 'navigate'
  const isApiRequest = url.pathname.startsWith('/api') || request.headers.has('authorization')

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  if (isApiRequest) {
    event.respondWith(fetch(request))
    return
  }

  if (isCacheableRuntimeAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return response
        })

        return cached || fetchPromise
      }),
    )
  }
})

self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data.type !== 'string') {
    return
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (event.data.type === 'CLEAR_AUTHENTICATED_STATE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('shelterflex-'))
            .map((key) => caches.delete(key)),
        ),
      ),
    )
  }
})
