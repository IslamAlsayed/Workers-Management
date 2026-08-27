const CACHE_NAME = "ommal-v1";
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then((networkResponse) => networkResponse)
        .catch(() => {
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
        });
    })
  );
});
