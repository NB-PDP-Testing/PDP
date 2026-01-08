/**
 * PlayerARC Service Worker
 *
 * Caching Strategy:
 * - Static assets (JS, CSS, images): Cache-first with network fallback
 * - API requests: Network-first with cache fallback
 * - HTML pages: Network-first with cache fallback
 */

const CACHE_NAME = "playerarc-v1";
const STATIC_CACHE = "playerarc-static-v1";
const DYNAMIC_CACHE = "playerarc-dynamic-v1";

// Static assets to pre-cache
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/logos/icon.png",
  "/logos/icon-192.png",
  "/logos/icon-512.png",
  "/manifest.json",
];

// Install event - pre-cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Pre-caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Service worker installed");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Pre-cache failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old versions of our caches
              return (
                name.startsWith("playerarc-") &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE
              );
            })
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip dev server requests
  if (url.pathname.startsWith("/_next/webpack-hmr")) {
    return;
  }

  // API requests: Network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // Static assets: Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages: Network-first with offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOffline(request, DYNAMIC_CACHE));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

/**
 * Check if a path is a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

/**
 * Cache-first strategy
 * Good for static assets that don't change often
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Return cached response, but also update cache in background
    fetchAndCache(request, cache);
    return cached;
  }

  return fetchAndCache(request, cache);
}

/**
 * Network-first strategy
 * Good for API requests and frequently changing content
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    // Only cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * Network-first with offline page fallback
 * Good for HTML pages
 */
async function networkFirstWithOffline(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Try cache first
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page
    const offlinePage = await caches.match("/offline");
    if (offlinePage) {
      return offlinePage;
    }

    // Return a basic offline response
    return new Response(
      "<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>",
      {
        headers: { "Content-Type": "text/html" },
        status: 503,
      }
    );
  }
}

/**
 * Fetch and cache helper
 */
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error("[SW] Fetch failed:", error);
    throw error;
  }
}

// Handle push notifications (for future use)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logos/icon-192.png",
      badge: "/logos/icon-192.png",
      data: data.data,
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing tab if available
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Handle background sync (for future use)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Placeholder for future background sync implementation
  console.log("[SW] Background sync triggered");
}

// Log service worker version
console.log("[SW] Service Worker v1 loaded");
