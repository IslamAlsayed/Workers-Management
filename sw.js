const CACHE_NAME = "ommal-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./workers.html",
  "./attendance.html",
  "./reports.html",
  "./settings.html",
  "./worker.html",
  "./css/app.css",
  "./css/login.css",
  "./css/toast.css",
  "./css/worker.css",
  "./js/auth.js",
  "./js/common.js",
  "./js/dashboard.js",
  "./js/workers.js",
  "./js/attendance.js",
  "./js/reports.js",
  "./js/settings.js",
  "./js/worker.js",
  "./favicon.ico",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Network First strategy (Always try network for fresh code, fallback to cache when offline)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
        });
      })
  );
});
