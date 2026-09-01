const CACHE_NAME = "ommal-v1.5.0";

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
  "./manifest.json",
];

// =========================================================
// Install
// =========================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// =========================================================
// Activate
// =========================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }

            return null;
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// =========================================================
// Fetch
// Network First
// =========================================================

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // GET فقط
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // تجاهل أي scheme غير HTTP/HTTPS
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // حفظ الاستجابة الناجحة في الـCache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => {
              return cache.put(request, responseToCache);
            })
            .catch((error) => {
              // لا نستخدم toast هنا لأن Service Worker
              // لا يمتلك DOM.
              console.warn("Failed to cache response:", error);
            });
        }

        return networkResponse;
      })

      .catch(() => {
        // ===================================================
        // Offline
        // ===================================================

        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // لو طلب HTML ولم نجد الصفحة في الـCache
          if (request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }

          return new Response("", {
            status: 503,
            statusText: "Offline",
          });
        });
      }),
  );
});
